import { atom } from 'nanostores';

export const isInputDrawerOpen = atom(false);

export const openInputDrawer = () => {
  isInputDrawerOpen.set(true);
};

export const closeInputDrawer = () => {
  isInputDrawerOpen.set(false);
};

export const toggleInputDrawer = () => {
  isInputDrawerOpen.set(!isInputDrawerOpen.get());
};
