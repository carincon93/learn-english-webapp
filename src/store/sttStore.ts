import { atom } from 'nanostores';

export interface NoteBlock {
  id: number;
  text: string;
  audioUrl?: string;
  analysis?: string;
  isAnalyzing?: boolean;
}

// Stores
export const blocksStore = atom<NoteBlock[]>([]);
export const currentTranscriptStore = atom<string>('');
export const isRecordingStore = atom<boolean>(false);

// Actions
export const addBlock = (block: NoteBlock) => {
  blocksStore.set([...blocksStore.get(), block]);
};

export const updateBlock = (id: number, updates: Partial<NoteBlock>) => {
  blocksStore.set(
    blocksStore.get().map(b => (b.id === id ? { ...b, ...updates } : b))
  );
};

export const removeBlockAction = (id: number) => {
  const blocks = blocksStore.get();
  const blockToRemove = blocks.find(b => b.id === id);
  if (blockToRemove?.audioUrl) {
    URL.revokeObjectURL(blockToRemove.audioUrl);
  }
  blocksStore.set(blocks.filter(b => b.id !== id));
};

export const clearAllBlocks = () => {
    blocksStore.get().forEach(b => {
        if (b.audioUrl) URL.revokeObjectURL(b.audioUrl);
    });
    blocksStore.set([]);
    currentTranscriptStore.set('');
};
