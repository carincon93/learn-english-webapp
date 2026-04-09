import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { currentReadingStore, phoneticsStore } from '../store/readingsStore';
import gsap from 'gsap';

export default function ReadingsDisplay() {
  const currentText = useStore(currentReadingStore);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [translator, setTranslator] = useState<any>(null);
  const translationCache = useRef<Map<string, string>>(new Map());

  // Split text into words, removing empty segments
  const lines = currentText ? currentText.split('\n') : [];

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
      console.log(phonetics);
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
          lines.map((line, lIdx) => (
            <div key={lIdx} className="readings__line">
              {line.split(/(\s+)/).map((part, pIdx) => {
                if (/\s+/.test(part)) {
                  return part;
                }
                if (part.length > 0) {
                  return (
                    <span
                      key={pIdx}
                      onMouseEnter={(e) => handleMouseEnter(e, part)}
                      onMouseLeave={handleMouseLeave}
                      className="readings__word"
                    >
                      {part}
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
