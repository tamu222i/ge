import { z } from 'zod';
import { VoiceNameSchema } from './session.ts';

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'model', 'system']),
  text: z.string(),
  timestamp: z.number(),
  isFinal: z.boolean().default(true),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatSessionSchema = z.object({
  id: z.string(),
  title: z.string().default('新しいセッション'),
  createdAt: z.number(),
  updatedAt: z.number(),
  voiceName: VoiceNameSchema.default('Zephyr'),
  presetName: z.string().default('日本語の会話パートナー'),
  systemInstruction: z.string().optional(),
  messages: z.array(ChatMessageSchema).default([]),
});
export type ChatSession = z.infer<typeof ChatSessionSchema>;

export const SessionSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  voiceName: VoiceNameSchema,
  presetName: z.string(),
  messageCount: z.number(),
  previewText: z.string().optional(),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
