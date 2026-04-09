import { defineDb, defineTable, column } from 'astro:db';

const Phrases = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    phrase: column.text(),
  }
});

const Readings = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    text: column.text(),
  }
});

const PhoneticTranscriptions = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    word: column.text({ unique: true }),
    phoneticTranscription: column.text(),
  }
});

// https://astro.build/db/config
export default defineDb({
  tables: { Phrases, Readings, PhoneticTranscriptions }
});
