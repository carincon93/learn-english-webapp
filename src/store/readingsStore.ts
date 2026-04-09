import { atom } from 'nanostores';

export const currentReadingStore = atom<string>('');
export const phoneticsStore = atom<Record<string, string>>({});

export const setReadingAction = (text: string) => {
  currentReadingStore.set(text);
};

export const clearReadingAction = () => {
  currentReadingStore.set('');
};

export const updatePhoneticsAction = (mappings: Record<string, string>) => {
  phoneticsStore.set({ ...phoneticsStore.get(), ...mappings });
};
