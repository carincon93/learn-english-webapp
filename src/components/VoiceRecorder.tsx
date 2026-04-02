import { useState, useEffect, useRef } from 'react';


interface VoiceRecorderProps {
  onTranscriptChange: (transcript: string) => void;
  onSegmentComplete?: (transcript: string) => void;
  onRecordingStateChange: (isRecording: boolean) => void;

  language?: string;
}

export default function VoiceRecorder({
  onTranscriptChange,
  onSegmentComplete,
  onRecordingStateChange,
  language = 'en-US'
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false); // tracks user intent to keep recording
  const accumulatedRef = useRef('');    // accumulated final transcript for current segment

  // Stable callback refs — updated every render, never trigger useEffect re-runs
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const onSegmentCompleteRef = useRef(onSegmentComplete);
  const onRecordingStateChangeRef = useRef(onRecordingStateChange);
  useEffect(() => { onTranscriptChangeRef.current = onTranscriptChange; });
  useEffect(() => { onSegmentCompleteRef.current = onSegmentComplete; });
  useEffect(() => { onRecordingStateChangeRef.current = onRecordingStateChange; });

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    const resetSilenceTimer = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        // Silence detected — stop recognition to commit this segment
        recognition.stop();
      }, 4000);
    };

    recognition.onstart = () => {
      setIsRecording(true);
      onRecordingStateChangeRef.current(true);
      setError(null);
      resetSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          accumulatedRef.current += (accumulatedRef.current ? ' ' : '') + t;
        } else {
          interimTranscript = t;
        }
      }
      const display = [accumulatedRef.current, interimTranscript].filter(Boolean).join(' ');
      onTranscriptChangeRef.current(display);
      resetSilenceTimer();
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted') return;

      const messages: Record<string, string> = {
        'no-speech': 'No speech detected. Please try again.',
        'not-allowed': 'Microphone access denied. Please allow microphone access.',
        'network': 'Network error. Check your internet connection and try again.',
      };
      const message = messages[event.error] ?? `Error: ${event.error}. Please try again.`;
      setError(message);
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type: 'error' } }));
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // Commit the current segment if it has content
      const text = accumulatedRef.current.trim();
      if (text && typeof onSegmentCompleteRef.current === 'function') {
        onSegmentCompleteRef.current(text);
        accumulatedRef.current = '';
        onTranscriptChangeRef.current('');
      }

      if (isRecordingRef.current) {
        // Auto-restart to keep listening continuously
        setTimeout(() => {
          if (isRecordingRef.current) {
            try { recognition.start(); } catch { /* already started */ }
          }
        }, 100);
      } else {
        setIsRecording(false);
        onRecordingStateChangeRef.current(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      isRecordingRef.current = false;
      // Null out handlers so onend doesn't fire stale callbacks after unmount
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, [language]); // only language triggers recreation

  const startRecording = () => {
    if (recognitionRef.current && !isRecordingRef.current) {
      isRecordingRef.current = true;
      accumulatedRef.current = '';
      try {
        recognitionRef.current.start();
        setError(null);
      } catch (err) {
        isRecordingRef.current = false;
        setError('Failed to start recording. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecordingRef.current) {
      isRecordingRef.current = false;
      recognitionRef.current.stop();
    }
  };

  if (!isSupported) {
    return <div className="voice-recorder__unsupported">{error}</div>;
  }

  return (
    <div className="voice-recorder">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`voice-recorder__btn ${isRecording ? 'voice-recorder__btn--recording' : 'voice-recorder__btn--idle'}`}
        title={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <div className="voice-recorder__sphere">
          <div className="voice-recorder__sphere-gradient voice-recorder__sphere-gradient--1"></div>
          <div className="voice-recorder__sphere-gradient voice-recorder__sphere-gradient--2"></div>
          <div className="voice-recorder__sphere-gradient voice-recorder__sphere-gradient--3"></div>
          <div className="voice-recorder__sphere-inner">
            {isRecording ? <span className="voice-recorder__sphere-stop">⏹</span> : <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-icon lucide-mic"><path d="M12 19v3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><rect x="9" y="2" width="6" height="13" rx="3" /></svg>}
          </div>
        </div>
      </button>
    </div>
  );
}
