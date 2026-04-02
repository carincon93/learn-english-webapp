import { defineDb, defineTable, column } from 'astro:db';

const Phrases = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    phrase: column.text(),
  }
});

// https://astro.build/db/config
export default defineDb({
  tables: { Phrases }
});
