import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwind from '@tailwindcss/vite';
import path from 'path';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [react()],

  adapter: node({
    mode: 'standalone',
  }),

  env: {
    schema: {
      DATABASE_URL: envField.string({ context: 'server', access: 'secret' }),
      GEMINI_API_KEY: envField.string({ context: 'server', access: 'secret' }),
      GEMINI_MODEL: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },

  vite: {
    plugins: [tailwind()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@carincon93/weird-ui/styles.css': path.resolve('../weird-ui/src/styles/styles.css'),
        '@carincon93/weird-ui': path.resolve('../weird-ui/src/index.ts'),
      },
    },
    ssr: {
      noExternal: ['@carincon93/weird-ui', '@radix-ui', 'radix-ui'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
});