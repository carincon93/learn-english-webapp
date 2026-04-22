import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import gsap from 'gsap';

import { currentReadingIndexStore, currentReadingStore, phoneticsStore } from '../stores/readingsStore';

export default function ReadingsDisplay() {
  const currentText = useStore(currentReadingStore);
  const currentReadingIndex = useStore(currentReadingIndexStore);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [translator, setTranslator] = useState<any>(null);
  const translationCache = useRef<Map<string, string>>(new Map());

  // Split text into words, removing empty segments
  const lines = currentText ? currentText.split('\n') : [];

  // Track a running global word index across all lines
  let globalWordIdx = 0;

  useEffect(() => {
    async function initTranslator() {
      try {
        const translatorObj = (window as any).Translator || (window as any).translation?.Translator;

        if (!translatorObj) {
          console.warn("Translator API not detected. Make sure flags are enabled.");
          return;
        }

        const availability = await translatorObj.availability({
          sourceLanguage: 'en',
          targetLanguage: 'es',
        });

        if (availability === 'available') {
          const t = await translatorObj.create({
            sourceLanguage: 'en',
            targetLanguage: 'es',
          });
          setTranslator(t);
          console.log("Translator initialized successfully in React!");
        } else if (availability === 'downloadable' || availability === 'downloading') {
          console.warn(`Translation model is ${availability}. Wait for first interaction to download.`);

          const handleGesture = async () => {
            try {
              const t = await translatorObj.create({
                sourceLanguage: 'en',
                targetLanguage: 'es',
              });
              setTranslator(t);
              window.removeEventListener("click", handleGesture);
            } catch (err) {
              console.error("Failed to create translator after gesture:", err);
            }
          };
          window.addEventListener("click", handleGesture, { once: true });
        }
      } catch (err) {
        console.error("Failed to init Translator:", err);
      }
    }

    initTranslator();
  }, []);

  const handleMouseEnter = async (e: React.MouseEvent<HTMLSpanElement>, word: string) => {
    const target = e.currentTarget;
    const rawWord = word.trim().replace(/[.,!?;:]/g, '');
    if (!rawWord || !tooltipRef.current) return;

    let translated = translationCache.current.get(rawWord);

    if (!translated && translator) {
      try {
        translated = await translator.translate(rawWord);
        translationCache.current.set(rawWord, translated || '');
      } catch (err) {
        console.error("Translation failed:", err);
      }
    }

    if (translated && tooltipRef.current) {
      const phonetics = phoneticsStore.get();
      const phonetic = phonetics[rawWord.toLowerCase()];

      const rect = target.getBoundingClientRect();
      const tooltip = tooltipRef.current;

      tooltip.innerHTML = `
        <span class="readings__tooltip-translation">${translated}</span>
        ${phonetic ? `<span class="readings__tooltip-phonetic">${phonetic}</span>` : ""}
      `;

      tooltip.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
      tooltip.style.top = `${rect.top + window.scrollY}px`;
      tooltip.style.transform = `translate(-50%, calc(-100% - 10px))`;

      gsap.to(tooltip, { opacity: 1, y: -42, duration: 0.2, ease: "power2.out" });
    }
  };

  const handleMouseLeave = () => {
    if (tooltipRef.current) {
      gsap.to(tooltipRef.current, { opacity: 0, y: 4, duration: 0.2, ease: "power2.in" });
    }
  };

  return (
    <>
      <div className="readings__text-content">
        {lines.some((line) => line.trim().length > 0) ? (
          lines.map((line, lineIdx) => (
            <div key={lineIdx} className="readings__line">
              {line.split(/(\s+)/).map((word, wordIdx) => {
                if (/\s+/.test(word)) {
                  return word;
                }
                if (word.length > 0) {
                  const currentWordIndex = globalWordIdx++;
                  return (
                    <span
                      key={wordIdx}
                      onMouseEnter={(e) => handleMouseEnter(e, word)}
                      onMouseLeave={handleMouseLeave}
                      className="readings__word"
                      style={{
                        color: currentReadingIndex > currentWordIndex ? 'black' : 'gray'
                      }}
                    >
                      {word}
                    </span>
                  );
                }
                return null;
              })}
              {line.trim() === "" && <br />}
            </div>
          ))
        ) : (
          <div className="readings__placeholder">
            No readings saved yet. Add some text to get started!
          </div>
        )}
      </div>

      <div
        ref={tooltipRef}
        className="readings__tooltip"
        style={{ opacity: 0, y: 4 }}
      />
    </>
  );
}
