import { useState, useCallback, useRef, useEffect } from 'react';
import VoiceRecorder from './VoiceRecorder';

interface NoteBlock {
  id: number;
  text: string;
}

let blockIdCounter = 0;

export default function SpeechToText() {
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [blocks, currentTranscript]);

  const handleTranscriptChange = useCallback((text: string) => {
    setCurrentTranscript(text);
  }, []);

  const handleSegmentComplete = useCallback((text: string) => {
    let processed = text.trim();
    if (!processed) return;

    // Capitalize first letter
    processed = processed.charAt(0).toUpperCase() + processed.slice(1).toLowerCase();

    // Replace "comma" and "dot" words with actual punctuation
    processed = processed.replace(/\bcomma\b/gi, ',');
    processed = processed.replace(/\bdot\b/gi, '.');

    // Ensure it ends with a dot
    if (!processed.endsWith('.')) {
      processed += '.';
    }

    setBlocks(prev => [...prev, { id: blockIdCounter++, text: processed }]);
    setCurrentTranscript('');
  }, []);

  const handleRecordingStateChange = useCallback((recording: boolean) => {
    setIsRecording(recording);
  }, []);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all notes?')) {
      setBlocks([]);
      setCurrentTranscript('');
    }
  };

  const isEmpty = blocks.length === 0 && !currentTranscript;

  return (
    <div className="stt__container">
      <h1 className="stt__title">Tell me something...</h1>

      <div className="stt__display-area" ref={scrollRef}>
        {isEmpty && !isRecording && (
          <div className="stt__placeholder">
            Click the microphone and start speaking...
          </div>
        )}

        {blocks.map(block => (
          <div key={block.id} className="stt__note-block">
            <p className="stt__note-text">{block.text}</p>
          </div>
        ))}
      </div>

      <div className="stt__mic-wrapper">
        <VoiceRecorder
          onTranscriptChange={handleTranscriptChange}
          onSegmentComplete={handleSegmentComplete}
          onRecordingStateChange={handleRecordingStateChange}
        />
      </div>
    </div>
  );
}
