import { db, Phrases, Readings, PhoneticTranscriptions, eq } from 'astro:db';
import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = import.meta.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = import.meta.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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
  bulkImportPhrases: defineAction({
    input: z.object({
      phrases: z.array(z.string()),
    }),
    handler: async (input) => {
      const values = input.phrases.map(phrase => ({ phrase }));
      const result = await db.insert(Phrases).values(values).returning();
      return result;
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
  phoneticTranscription: defineAction({
    input: z.object({
      text: z.string(),
    }),
    handler: async (input) => {
      if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not defined in environment variables');
      }

      const prompt = `Convert the following text to phonetic transcription: ${input.text}. 
        Return only a list of words separated by commas with their phonetic transcription. 
        Example:
        Input: Hello, how are you?
        Output: Hello: /həˈloʊ/, how: /haʊ/, are: /ɑːr/, you: /juː/
      `;

      const result = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      });

      const transcription = result.text || '';
      // Save transcription for each word
      const entries = transcription.split(',');
      for (const entry of entries) {
        const parts = entry.split(':');
        if (parts.length < 2) continue;

        const word = parts[0].trim().toLowerCase();
        const phoneticTranscription = parts[1].trim();

        console.log("Word:", word);
        console.log("Phonetic Transcription:", phoneticTranscription);

        // Verify if word already exists in database
        const existingWord = await db.select()
          .from(PhoneticTranscriptions)
          .where(eq(PhoneticTranscriptions.word, word))
          .get();

        if (existingWord) continue;

        await db.insert(PhoneticTranscriptions).values({
          id: crypto.randomUUID(),
          word: word,
          phoneticTranscription: phoneticTranscription,
        });
      }

      return { transcription };
    },
  }),
  analyzeAudio: defineAction({
    input: z.object({
      audioBase64: z.string(),
      mimeType: z.string(),
    }),
    handler: async (input) => {
      if (!GEMINI_API_KEY) {
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
          model: GEMINI_MODEL,
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
  saveReading: defineAction({
    input: z.object({
      readingId: z.string(),
      text: z.string(),
    }),
    handler: async (input) => {
      try {
        await db.insert(Readings).values({ id: input.readingId, text: input.text });

        return { success: true, readingId: input.readingId };
      } catch (error: any) {
        console.error('Save Reading Error:', error);
        throw new Error('Failed to save reading.');
      }
    },
  }),
  deleteAllReadings: defineAction({
    handler: async () => {
      try {
        await db.delete(Readings);
        return { success: true };
      } catch (error: any) {
        console.error('Delete All Readings Error:', error);
        throw new Error('Failed to delete readings.');
      }
    },
  }),
};
