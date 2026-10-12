import { z } from 'zod';

export const VoiceNameSchema = z.enum([
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Zephyr',
]);
export type VoiceName = z.infer<typeof VoiceNameSchema>;

export const ThinkingLevelSchema = z.enum(['LOW', 'HIGH', 'MINIMAL']).default('LOW');

export const SessionConfigSchema = z.object({
  model: z.string().default('gemini-3.8-live'),
  voiceName: VoiceNameSchema.default('Zephyr'),
  systemInstruction: z
    .string()
    .default(
      'You are Gemini Live, a friendly, concise, and helpful conversational voice AI. Respond naturally and politely.'
    ),
  thinkingConfig: z
    .object({
      thinkingLevel: ThinkingLevelSchema.optional(),
    })
    .optional(),
});
export type SessionConfig = z.infer<typeof SessionConfigSchema>;

export enum SessionState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  INTERRUPTED = 'INTERRUPTED',
  ERROR = 'ERROR',
}

export const ClientStartSessionMessageSchema = z.object({
  type: z.literal('start_session'),
  config: SessionConfigSchema.optional(),
});

export const ClientAudioChunkMessageSchema = z.object({
  type: z.literal('audio_chunk'),
  audio: z.string(), // base64 encoded PCM 16kHz
});

export const ClientTextInputMessageSchema = z.object({
  type: z.literal('text_input'),
  text: z.string(),
});

export const ClientInterruptMessageSchema = z.object({
  type: z.literal('interrupt'),
});

export const ClientEndSessionMessageSchema = z.object({
  type: z.literal('end_session'),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  ClientStartSessionMessageSchema,
  ClientAudioChunkMessageSchema,
  ClientTextInputMessageSchema,
  ClientInterruptMessageSchema,
  ClientEndSessionMessageSchema,
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export const ServerSessionStartedMessageSchema = z.object({
  type: z.literal('session_started'),
  sessionId: z.string(),
  config: SessionConfigSchema,
});

export const ServerAudioChunkMessageSchema = z.object({
  type: z.literal('audio_chunk'),
  audio: z.string(), // base64 encoded PCM 24kHz
});

export const ServerTranscriptMessageSchema = z.object({
  type: z.literal('transcript'),
  role: z.enum(['user', 'model', 'system']),
  text: z.string(),
  isFinal: z.boolean().default(false),
  timestamp: z.number().default(() => Date.now()),
});

export const ServerInterruptedMessageSchema = z.object({
  type: z.literal('interrupted'),
});

export const ServerStatusMessageSchema = z.object({
  type: z.literal('status'),
  status: z.nativeEnum(SessionState),
});

export const ServerErrorMessageSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  ServerSessionStartedMessageSchema,
  ServerAudioChunkMessageSchema,
  ServerTranscriptMessageSchema,
  ServerInterruptedMessageSchema,
  ServerStatusMessageSchema,
  ServerErrorMessageSchema,
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

export interface TranscriptTurn {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  isFinal: boolean;
  timestamp: number;
}
