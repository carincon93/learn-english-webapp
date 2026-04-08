import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';


interface VoiceRecorderProps {
  onTranscriptChange: (transcript: string) => void;
  onSegmentComplete?: (transcript: string, audioUrl: string) => void;
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
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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

  // Gradient animation
  useLayoutEffect(() => {
    if (!isRecording) return; // Only animate when stop button is visible

    const ctx = gsap.context(() => {
      // Animate stop gradient rotation
      gsap.to('#stop-gradient', {
        attr: { gradientTransform: 'rotate(360, 0.5, 0.5)' },
        duration: 4,
        repeat: -1,
        ease: 'none',
      });

      // Subtly shift hue for extra flair (only for stop button)
      gsap.to('#stop-gradient stop', {
        stopColor: (i: number) => i % 2 === 0 ? '#f163d9ff' : '#f75555ff',
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });
    return () => ctx.revert();
  }, [isRecording]);

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

      // Start MediaRecorder if available
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
        audioChunksRef.current = []; // Clear chunks right before starting new segment
        mediaRecorderRef.current.start();
      }
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

    const stopStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // Stop MediaRecorder and wait for the blob before emitting
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);

          const text = accumulatedRef.current.trim();
          if (text && typeof onSegmentCompleteRef.current === 'function') {
            onSegmentCompleteRef.current(text, audioUrl);
            accumulatedRef.current = '';
            onTranscriptChangeRef.current('');
          }
        };
        mediaRecorderRef.current.stop();
      } else {
        const text = accumulatedRef.current.trim();
        if (text && typeof onSegmentCompleteRef.current === 'function') {
          onSegmentCompleteRef.current(text, '');
          accumulatedRef.current = '';
          onTranscriptChangeRef.current('');
        }
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
        stopStream(); // Release microphone hardware
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopStream(); // Release microphone hardware on unmount
    };
  }, [language]); // only language triggers recreation

  const startRecording = async () => {
    if (recognitionRef.current && !isRecordingRef.current) {
      isRecordingRef.current = true;
      accumulatedRef.current = '';

      try {
        // Setup MediaStream and MediaRecorder
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current = mediaRecorder;

        recognitionRef.current.start();
        setError(null);
      } catch (err) {
        console.error('Recording initialization failed:', err);
        isRecordingRef.current = false;
        setError('Microphone access denied or initialization failed.');
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecordingRef.current) {
      isRecordingRef.current = false;
      recognitionRef.current.stop();
      // MediaRecorder and stream are stopped in recognition.onend when isRecordingRef is false
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
        {isRecording ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#stop-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="stop-gradient" gradientUnits="objectBoundingBox" gradientTransform="rotate(0, 0.5, 0.5)">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#9333ea" />
              </linearGradient>
            </defs>
            <rect width="18" height="18" x="3" y="3" rx="2" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 23 20" fill="none" stroke="url(#mic-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-icon lucide-mic">
            <defs>
              <linearGradient id="mic-gradient" gradientUnits="objectBoundingBox" gradientTransform="rotate(0, 0.5, 0.5)">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#9333ea" />
              </linearGradient>
            </defs>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <rect x="9" y="2" width="6" height="13" rx="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
