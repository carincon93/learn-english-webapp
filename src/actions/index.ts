import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_MODEL as GEMINI_MODEL_ENV } from 'astro:env/server';

import { prisma } from '../../db/db';

const GEMINI_MODEL = GEMINI_MODEL_ENV ?? 'gemini-2.0-flash';
const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const server = {
  addPhrase: defineAction({
    input: z.object({
      phrase: z.string(),
    }),
    handler: async (input) => {
      return prisma.phrase.create({ data: { phrase: input.phrase } });
    },
  }),
  updatePhrase: defineAction({
    input: z.object({
      id: z.number(),
      phrase: z.string(),
    }),
    handler: async (input) => {
      return prisma.phrase.update({
        where: { id: input.id },
        data: { phrase: input.phrase },
      });
    },
  }),
  bulkImportPhrases: defineAction({
    input: z.object({
      phrases: z.array(z.string()),
    }),
    handler: async (input) => {
      await prisma.phrase.createMany({
        data: input.phrases.map((phrase) => ({ phrase })),
      });
      return prisma.phrase.findMany();
    },
  }),
  deletePhrase: defineAction({
    input: z.object({
      id: z.number(),
    }),
    handler: async (input) => {
      await prisma.phrase.delete({ where: { id: input.id } });
      return { success: true };
    },
  }),
  phoneticTranscription: defineAction({
    input: z.object({
      text: z.string(),
    }),
    handler: async (input) => {

      const prompt = `Convert the following text to phonetic transcription: ${input.text}.
        Return only a list of words separated by commas with their phonetic transcription.
        Example:
        Input: Hello, how are you?
        Output: Hello: /həˈloʊ/, how: /haʊ/, are: /ɑːr/, you: /juː/
      `;

      const result = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const transcription = result.text || '';
      const entries = transcription.split(',');

      for (const entry of entries) {
        const parts = entry.split(':');
        if (parts.length < 2) continue;

        const word = parts[0].trim().toLowerCase();
        const phoneticTranscription = parts[1].trim();

        const existing = await prisma.phoneticTranscription.findUnique({
          where: { word },
        });
        if (existing) continue;

        await prisma.phoneticTranscription.create({
          data: {
            id: crypto.randomUUID(),
            word,
            phoneticTranscription,
            audio: '',
          },
        });
      }

      return { transcription };
    },
  }),
  playWord: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input) => {

      const word = await prisma.phoneticTranscription.findUnique({
        where: { id: input.id },
      });

      if (!word) throw new Error('Word not found');

      let audioData = word.audio;
      let mimeType = word.audioMimeType;

      if (!audioData) {
        const response: any = await client.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text: `Say clearly: ${word.word}` }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Aoede' },
              },
            },
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        audioData = part?.inlineData?.data;
        mimeType = part?.inlineData?.mimeType || 'audio/mpeg';

        if (audioData) {
          await prisma.phoneticTranscription.update({
            where: { id: input.id },
            data: { audio: audioData, audioMimeType: mimeType },
          });
        } else {
          console.error('No inlineData found in response parts.');
        }
      }

      return { audio: audioData, mimeType };
    },
  }),
  analyzeAudio: defineAction({
    input: z.object({
      audioBase64: z.string(),
      mimeType: z.string(),
    }),
    handler: async (input) => {

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
                { inlineData: { data: input.audioBase64, mimeType: input.mimeType } },
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
        await prisma.reading.create({ data: { id: input.readingId, text: input.text } });
        return { success: true, readingId: input.readingId };
      } catch (error: any) {
        console.error('Save Reading Error:', error);
        throw new Error('Failed to save reading.');
      }
    },
  }),
  deleteAllReadings: defineAction({
    input: z.object({}).optional(),
    handler: async () => {
      try {
        await prisma.reading.deleteMany();
        return { success: true };
      } catch (error: any) {
        console.error('Delete All Readings Error:', error);
        throw new Error('Failed to delete readings.');
      }
    },
  }),
  deletePhoneticTranscription: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input) => {
      try {
        await prisma.phoneticTranscription.delete({ where: { id: input.id } });
        return { success: true };
      } catch (error: any) {
        console.error('Delete Phonetic Transcription Error:', error);
        throw new Error('Failed to delete phonetic transcription.');
      }
    },
  }),
};
