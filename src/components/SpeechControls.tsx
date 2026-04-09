import { useCallback } from 'react';
import VoiceRecorder from './VoiceRecorder';
import { addBlock, currentTranscriptStore, isRecordingStore } from '../store/speechToTextStore';

let blockIdCounter = Date.now();

export default function SpeechControls() {
  const handleTranscriptChange = useCallback((text: string) => {
    currentTranscriptStore.set(text);
  }, []);

  const handleSegmentComplete = useCallback((text: string, audioUrl?: string) => {
    let processed = text.trim();
    if (!processed) return;

    // Capitalize first letter
    processed = processed.charAt(0).toUpperCase() + processed.slice(1).toLowerCase();

    // Replace punctuation words
    processed = processed.replace(/\s*\bcomma\b/gi, ',');
    processed = processed.replace(/\s*\bdot\b/gi, '.');
    processed = processed.replace(/\s*\bquestion mark\b/gi, '?');
    processed = processed.replace(/\s*\bexclamation mark\b/gi, '!');
    processed = processed.replace(/\s*\bi\s*\b/gi, ' I ');

    if (!processed.endsWith('.') && !processed.endsWith('?') && !processed.endsWith('!')) {
      processed += '.';
    }

    addBlock({ id: blockIdCounter++, text: processed, audioUrl });
    currentTranscriptStore.set('');
  }, []);

  const handleRecordingStateChange = useCallback((recording: boolean) => {
    isRecordingStore.set(recording);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', height: '100%' }} >
      <VoiceRecorder
        onTranscriptChange={handleTranscriptChange}
        onSegmentComplete={handleSegmentComplete}
        onRecordingStateChange={handleRecordingStateChange}
      />
    </div>
  );
}
