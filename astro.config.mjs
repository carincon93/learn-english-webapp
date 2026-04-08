// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import db from '@astrojs/db';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [react(), db()],

  adapter: node({
    mode: 'standalone',
  }),

  vite: {
    optimizeDeps: {
      include: ['react-dom/client'],
    },
  },
});