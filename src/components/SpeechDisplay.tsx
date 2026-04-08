import { useRef, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { blocksStore, isRecordingStore, updateBlock, removeBlockAction } from '../store/sttStore';
import { actions } from 'astro:actions';
import gsap from 'gsap';

export default function SpeechDisplay() {
  const blocks = useStore(blocksStore);
  const isRecording = useStore(isRecordingStore);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [blocks]);

  const playAudio = (id: number) => {
    const audioEl = document.getElementById(`audio-${id}`) as HTMLAudioElement;
    if (audioEl) {
      audioEl.currentTime = 0;
      audioEl.play().catch(err => console.error('Playback failed:', err));
    }
  };

  const analyzeBlock = async (id: number, audioUrl: string) => {
    updateBlock(id, { isAnalyzing: true });

    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(blob);
      const audioBase64 = await base64Promise;

      const { data, error } = await actions.analyzeAudio({
        audioBase64,
        mimeType: blob.type
      });

      if (error) throw error;

      updateBlock(id, { analysis: data.analysis, isAnalyzing: false });

      setTimeout(() => {
        gsap.from(`.stt__analysis-card-${id}`, {
          opacity: 0,
          y: 20,
          duration: 0.5,
          ease: "back.out(1.7)"
        });
      }, 50);

    } catch (err: any) {
      console.error('Analysis failed:', err);
      updateBlock(id, { isAnalyzing: false });
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: { message: 'AI Analysis failed.', type: 'error' }
      }));
    }
  };

  return (
    <div className="stt__display-area" ref={scrollRef}>
      {blocks.length === 0 && (
        <div className={`stt__placeholder ${isRecording ? 'stt__placeholder--listening' : ''}`}>
          {isRecording ? 'Listening...' : 'Click the microphone and start speaking...'}
        </div>
      )}

      {blocks.map(block => (
        <div key={block.id} className="stt__note-block">
          <p className="stt__note-text">{block.text}</p>
          <div className="stt__audio-wrapper">
            {block.audioUrl && (
              <>
                <audio id={`audio-${block.id}`} src={block.audioUrl} className="stt__audio-player" />
                <button className="stt__play-btn" onClick={() => playAudio(block.id)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v3" /></svg>
                </button>

                <span className="stt__audio-separator">|</span>

                <button
                  className={`stt__analyze-btn ${block.isAnalyzing ? 'stt__analyze-btn--loading' : ''}`}
                  onClick={() => block.audioUrl && analyzeBlock(block.id, block.audioUrl)}
                  disabled={block.isAnalyzing}
                >
                  {block.isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg>
                </button>

                <span className="stt__audio-separator">|</span>
              </>
            )}

            <button className="stt__remove-btn" onClick={() => removeBlockAction(block.id)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            </button>
          </div>

          {block.analysis && (
            <div className={`stt__analysis-card stt__analysis-card-${block.id}`}>
              <div className="stt__analysis-header">AI Coach Feedback</div>
              <div className="stt__analysis-body" dangerouslySetInnerHTML={{
                __html: block.analysis.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
