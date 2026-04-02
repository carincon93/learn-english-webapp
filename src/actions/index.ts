import { db, Phrases, eq } from 'astro:db';
import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
  addPhrase: defineAction({
    input: z.object({
      phrase: z.string(),
    }),
    handler: async (input) => {
      const result = await db.insert(Phrases).values({
        phrase: input.phrase,
      }).returning();
      return result[0];
    },
  }),
  updatePhrase: defineAction({
    input: z.object({
      id: z.number(),
      phrase: z.string(),
    }),
    handler: async (input) => {
      const result = await db.update(Phrases)
        .set({ phrase: input.phrase })
        .where(eq(Phrases.id, input.id))
        .returning();
      return result[0];
    },
  }),
  deletePhrase: defineAction({
    input: z.object({
      id: z.number(),
    }),
    handler: async (input) => {
      await db.delete(Phrases).where(eq(Phrases.id, input.id));
      return { success: true };
    },
  }),
};
