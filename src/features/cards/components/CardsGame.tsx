import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { actions } from 'astro:actions';

import VoiceRecorder from '../../../shared/components/VoiceRecorder';
import Drawer from '../../../shared/components/ui/Drawer';

export interface GamePhrase {
  id: number;
  phrase: string;
}

interface CardsProps {
  initialPhrases: GamePhrase[];
  showSimilarityScore?: boolean;
}

export default function CardsGame({
  initialPhrases,
  showSimilarityScore = true
}: CardsProps) {
  const [phrases, setPhrases] = useState<GamePhrase[]>(initialPhrases);
  const [isManageMode, setIsManageMode] = useState(false);
  const [newPhraseInput, setNewPhraseInput] = useState('');
  const [editingPhraseId, setEditingPhraseId] = useState<number | null>(null);
  const [editPhraseInput, setEditPhraseInput] = useState('');
  const [jsonPreview, setJsonPreview] = useState<string | null>(null);
  const [parsedPhrases, setParsedPhrases] = useState<string[] | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [similarityScore, setSimilarityScore] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'partial' | 'retry' | null;
    message: string;
  }>({ type: null, message: '' });
  const [isRecording, setIsRecording] = useState(false);
  const [evaluationId, setEvaluationId] = useState(0);
  const similarityScoreRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    if (similarityScore > 0 && similarityScoreRef.current) {
      gsap.killTweensOf(similarityScoreRef.current);
      const tl = gsap.timeline();

      tl.fromTo(similarityScoreRef.current,
        {
          scale: 0.5,
          opacity: 0,
          y: 20,
          filter: 'blur(10px)'
        },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.5,
          ease: "back.out(1.7)"
        }
      ).to(similarityScoreRef.current, {
        opacity: 0,
        y: -20,
        scale: 0.8,
        filter: 'blur(5px)',
        duration: 0.4,
        delay: 1.5,
        ease: "power2.in"
      });
    }
  }, [similarityScore, evaluationId]);

  // Function to show global toast
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'partial' | 'retry') => {
    window.dispatchEvent(new CustomEvent('app:toast', {
      detail: { message, type }
    }));
  }, []);

  const currentPhrase = phrases[currentPhraseIndex];

  const calculateSimilarity = useCallback((str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?!'"]/g, '');
    const s2 = str2.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?!'"]/g, '');

    console.log('Similarity Check - Target:', s1, 'Recognized:', s2);

    if (s1 === s2) return 100;

    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    let matchCount = 0;
    const maxLength = Math.max(words1.length, words2.length);

    words1.forEach(word => {
      if (words2.includes(word)) matchCount++;
    });

    return Math.round((matchCount / maxLength) * 100);
  }, []);

  const nextPhrase = useCallback(() => {
    if (currentPhraseIndex < phrases.length - 1) {
      setCurrentPhraseIndex(prev => prev + 1);
      setTranscript('');
      transcriptRef.current = '';
      setFeedback({ type: null, message: '' });
    } else {
      setFeedback({ type: 'success', message: `🎉 Game Complete!` });
      showToast(`🎉 Game Complete!`, 'success');
    }
  }, [currentPhraseIndex, phrases.length]);

  const evaluatePronunciation = useCallback(() => {
    const currentTranscript = transcriptRef.current;

    if (!currentTranscript || !currentPhrase) {
      console.log('Evaluation skipped: empty transcript or no phrase');
      return;
    }

    const similarity = calculateSimilarity(currentPhrase.phrase, currentTranscript);

    setSimilarityScore(similarity);
    setEvaluationId(prev => prev + 1);

    if (similarity >= 90) {
      const msg = `Excellent! Perfect pronunciation! (${similarity}% match)`;
      setFeedback({ type: 'success', message: msg });
      showToast(msg, 'success');
      setTimeout(() => nextPhrase(), 2000);
    } else if (similarity >= 70) {
      const msg = `Good try! Almost there. (${similarity}% match) - Try again!`;
      setFeedback({ type: 'partial', message: msg });
      showToast(msg, 'partial');
    } else {
      const msg = `Keep practicing! (${similarity}% match) - Try again!`;
      setFeedback({ type: 'retry', message: msg });
      showToast(msg, 'retry');
    }
  }, [currentPhrase, calculateSimilarity, nextPhrase]);

  const handleTranscriptChange = useCallback((text: string) => {
    setTranscript(text);
    transcriptRef.current = text;
  }, []);

  const handleRecordingStateChange = useCallback((recording: boolean) => {
    setIsRecording(recording);

    // Evaluate when recording stops and we have a transcript
    if (!recording && transcriptRef.current) {
      evaluatePronunciation();
    }
  }, [evaluatePronunciation]);

  const resetGame = () => {
    setCurrentPhraseIndex(0);
    setSimilarityScore(0);
    setEvaluationId(0);
    setTranscript('');
    transcriptRef.current = '';
    setFeedback({ type: null, message: '' });
  };

  // JSON Import Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const parsed = JSON.parse(text);
        let extracted: string[] = [];

        if (Array.isArray(parsed)) {
          extracted = parsed.map((item) => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item !== null && typeof item.phrase === 'string') return item.phrase;
            throw new Error('Invalid item format');
          });
        } else {
          throw new Error('JSON must be an array');
        }

        if (extracted.length === 0) throw new Error('No phrases found in file');

        setParsedPhrases(extracted);
        setJsonPreview(JSON.stringify(extracted, null, 2));
        setJsonError(null);
      } catch (err: any) {
        setJsonError(err.message || 'Invalid JSON');
        setParsedPhrases(null);
        setJsonPreview(null);
      }
    };
    reader.readAsText(file);
    // reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleBulkImport = async () => {
    if (!parsedPhrases || parsedPhrases.length === 0) return;
    setIsImporting(true);
    const { data, error } = await actions.bulkImportPhrases({ phrases: parsedPhrases });
    setIsImporting(false);
    if (error) {
      showToast('Error importing phrases', 'error');
    } else if (data) {
      setPhrases(prev => [...prev, ...data]);
      setParsedPhrases(null);
      setJsonPreview(null);
      setJsonError(null);
      showToast(`${data.length} phrase${data.length !== 1 ? 's' : ''} imported!`, 'success');
    }
  };

  const clearJsonImport = () => {
    setParsedPhrases(null);
    setJsonPreview(null);
    setJsonError(null);
  };

  // CRUD Handlers
  const handleAddPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhraseInput.trim()) return;

    const { data, error } = await actions.addPhrase({ phrase: newPhraseInput });
    if (error) {
      showToast('Error adding phrase', 'error');
    } else if (data) {
      setPhrases([...phrases, data]);
      setNewPhraseInput('');
      showToast('Phrase added!', 'success');
    }
  };

  const handleUpdatePhrase = async (id: number) => {
    if (!editPhraseInput.trim()) return;

    const { data, error } = await actions.updatePhrase({ id, phrase: editPhraseInput });
    if (error) {
      showToast('Error updating phrase', 'error');
    } else if (data) {
      setPhrases(phrases.map(p => p.id === id ? data : p));
      setEditingPhraseId(null);
      showToast('Phrase updated!', 'success');
    }
  };

  const handleDeletePhrase = async (id: number) => {
    if (!confirm('Are you sure you want to delete this phrase?')) return;

    const { error } = await actions.deletePhrase({ id });
    if (error) {
      showToast('Error deleting phrase', 'error');
    } else {
      setPhrases(phrases.filter(p => p.id !== id));
      if (currentPhraseIndex >= phrases.length - 1 && currentPhraseIndex > 0) {
        setCurrentPhraseIndex(prev => prev - 1);
      }
      showToast('Phrase deleted!', 'success');
    }
  };

  return (
    <div className="card-game__card-wrapper">
      <button
        className="card-game__manage-toggle"
        onClick={() => setIsManageMode(true)}
        title="Manage Phrases"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
      </button>

      <div className="card-game__card">
        <div
          className="card-game__card-noise"
        />

        {showSimilarityScore && (
          <div className="card-game__card-score" ref={similarityScoreRef}>
            <div className="card-game__card-score-badge">
              <span className="card-game__card-score-value">{similarityScore}</span>
            </div>
          </div>
        )}

        {/* Current Phrase */}
        {currentPhrase && currentPhraseIndex < phrases.length ? (
          <div className="card-game__card-phrase">
            <p className="card-game__card-phrase-text">"{currentPhrase.phrase}"</p>
          </div>
        ) : (
          <div className="card-game__card-phrase">
            <p className="card-game__card-phrase-text" style={{ fontSize: '1.2rem', opacity: 0.6 }}>
              {phrases.length === 0 ? "No phrases added yet." : "Ready to play?"}
            </p>
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="card-game__card-transcript">
            <div className="card-game__card-transcript-label">You said:</div>
            <div className="card-game__card-transcript-text">"{transcript}"</div>
          </div>
        )}
      </div>
      <div className="card-game__card-actions">
        <button className="card-game__card-btn card-game__card-btn--reset" onClick={resetGame}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw-icon lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
        </button>

        <VoiceRecorder
          onTranscriptChange={handleTranscriptChange}
          onRecordingStateChange={handleRecordingStateChange}
          language="en-US"
        />

        <button
          className="card-game__card-btn card-game__card-btn--skip"
          onClick={nextPhrase}
          disabled={isRecording || phrases.length === 0 || currentPhraseIndex === phrases.length - 1 || feedback.message.includes('Complete')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-skip-forward-icon lucide-skip-forward"><path d="M21 4v16" /><path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z" /></svg>
        </button>
      </div>

      {/* Management UI Drawer */}
      <Drawer
        isOpen={isManageMode}
        onClose={() => setIsManageMode(false)}
        title="Manage Phrases"
      >
        <form className="card-game__manage-form" onSubmit={handleAddPhrase}>
          <input
            type="text"
            placeholder="Add a new phrase..."
            className="card-game__manage-input"
            value={newPhraseInput}
            onChange={(e) => setNewPhraseInput(e.target.value)}
          />
          <button type="submit" className="card-game__manage-add-btn">Add</button>
        </form>

        {/* JSON Import */}
        <div className="card-game__import">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="card-game__import-file-input"
            onChange={handleFileChange}
          />
          <button
            className="card-game__import-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
            Upload JSON
          </button>
          <span className="card-game__import-hint">
            Format: <code>["phrase 1", "phrase 2"]</code> or <code>[{"{"}"phrase": "..."{"}"}]</code>
          </span>

          {jsonError && (
            <div className="card-game__import-error">{jsonError}</div>
          )}

          {jsonPreview && parsedPhrases && (
            <div className="card-game__import-preview">
              <div className="card-game__import-preview-header">
                <span>{parsedPhrases.length} phrase{parsedPhrases.length !== 1 ? 's' : ''} ready to import</span>
                <button className="card-game__import-preview-clear" onClick={clearJsonImport} title="Clear">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>
              </div>
              <pre className="card-game__import-preview-code">{jsonPreview}</pre>
              <button
                className="card-game__import-confirm-btn"
                onClick={handleBulkImport}
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : `Import ${parsedPhrases.length} phrase${parsedPhrases.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>

        <div className="card-game__phrase-list">
          {phrases.map((p) => (
            <div key={p.id} className="card-game__phrase-item">
              {editingPhraseId === p.id ? (
                <input
                  className="card-game__phrase-edit-input"
                  value={editPhraseInput}
                  onChange={(e) => setEditPhraseInput(e.target.value)}
                  onBlur={() => handleUpdatePhrase(p.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdatePhrase(p.id)}
                  autoFocus
                />
              ) : (
                <div className="card-game__phrase-text-display">{p.phrase}</div>
              )}

              <div className="card-game__phrase-actions">
                <button
                  className="card-game__phrase-btn"
                  onClick={() => {
                    setEditingPhraseId(p.id);
                    setEditPhraseInput(p.phrase);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                </button>
                <button
                  className="card-game__phrase-btn card-game__phrase-btn--delete"
                  onClick={() => handleDeletePhrase(p.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
