import { useCallback, useRef } from 'react';

import VoiceRecorder from '../../../shared/components/VoiceRecorder';
import { currentReadingStore, setCurrentReadingIndexAction } from '../../readings/stores/readingsStore';
import { addBlock, currentTranscriptStore, isRecordingStore } from '../stores/speechToTextStore';

let blockIdCounter = Date.now();

export default function SpeechControls() {
  const correctPronunciationWordIndex = useRef(0);

  const handleTranscriptChange = useCallback((textTranscript: string) => {
    if (!textTranscript) return;
    currentTranscriptStore.set(textTranscript);

    // Read text at the same time as user speaks
    // Flatten array of current reading 
    const toWords = (text: string) => text.toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(' ').filter(Boolean);
    const currentReading = toWords(currentReadingStore.get());
    const wordsTranscript = textTranscript.toLowerCase().split(' ');
    if (currentReading) {
      console.log(wordsTranscript[wordsTranscript.length - 1], currentReading[correctPronunciationWordIndex.current]);
      if (wordsTranscript[wordsTranscript.length - 1] === currentReading[correctPronunciationWordIndex.current]) {
        correctPronunciationWordIndex.current++;
        setCurrentReadingIndexAction(correctPronunciationWordIndex.current);
      }
    }
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
