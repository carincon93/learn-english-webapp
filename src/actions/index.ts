import { db, Phrases, eq } from 'astro:db';
import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({ apiKey: import.meta.env.GEMINI_API_KEY || '' });

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
  analyzeAudio: defineAction({
    input: z.object({
      audioBase64: z.string(),
      mimeType: z.string(),
    }),
    handler: async (input) => {
      if (!import.meta.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not defined in environment variables');
      }

      const prompt = `
        Act as an expert English language coach. 
        I will provide an audio recording of my speech. 
        Analyze it for:
        1. Grammar & Vocabulary: Correct any mistakes or suggest more natural phrasing.
        2. Pronunciation: Identify if any words sounded incorrect or unclear.
        3. Feedback: Provide 1-2 practical tips to improve.
        
        Keep your response concise, friendly, and use markdown for formatting. 
        Use simple phonetic spelling instead of IPA for pronunciation tips (e.g. "Sheep" vs "Ship").
      `;

      try {
        const response = await client.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    data: input.audioBase64,
                    mimeType: input.mimeType,
                  },
                },
              ],
            },
          ],
        });

        return { analysis: response.text };
      } catch (error: any) {
        console.error('Gemini Analysis Error:', error);
        throw new Error('Failed to analyze audio. Please try again later.');
      }
    },
  }),
};
