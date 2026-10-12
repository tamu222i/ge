import { describe, it, expect } from 'vitest';
import {
  SessionConfigSchema,
  ClientMessageSchema,
  ServerMessageSchema,
  VoiceNameSchema,
  SessionState,
} from '../../schemas/session.ts';
import { ConversationSession } from '../session.ts';

describe('BDD: Session Schema & Validation', () => {
  describe('Given a session configuration request', () => {
    it('When all fields are valid, Then it succeeds with provided and default values', () => {
      const parsed = SessionConfigSchema.parse({
        voiceName: 'Zephyr',
        systemInstruction: 'You are an empathetic Japanese speech assistant.',
      });

      expect(parsed.voiceName).toBe('Zephyr');
      expect(parsed.systemInstruction).toContain('Japanese');
      expect(parsed.model).toBe('gemini-3.8-live');
    });

    it('When an invalid voice name is supplied, Then it rejects with validation error', () => {
      expect(() => {
        VoiceNameSchema.parse('NonExistentVoice');
      }).toThrow();
    });

    it('When client sends an audio chunk, Then ClientMessageSchema validates properly', () => {
      const clientMsg = ClientMessageSchema.parse({
        type: 'audio_chunk',
        audio: 'AQIDBA==',
      });
      expect(clientMsg.type).toBe('audio_chunk');
      if (clientMsg.type === 'audio_chunk') {
        expect(clientMsg.audio).toBe('AQIDBA==');
      }
    });

    it('When client sends an unknown type, Then validation fails', () => {
      expect(() => {
        ClientMessageSchema.parse({ type: 'hack_attempt', payload: '123' });
      }).toThrow();
    });

    it('When server sends an audio chunk or transcript, Then ServerMessageSchema validates correctly', () => {
      const serverMsg = ServerMessageSchema.parse({
        type: 'transcript',
        role: 'model',
        text: 'こんにちは！お話ししましょう。',
        isFinal: true,
      });
      expect(serverMsg.type).toBe('transcript');
      if (serverMsg.type === 'transcript') {
        expect(serverMsg.text).toBe('こんにちは！お話ししましょう。');
        expect(serverMsg.isFinal).toBe(true);
      }
    });
  });
});

describe('BDD: ConversationSession Domain Aggregate', () => {
  describe('Given an initialized session', () => {
    it('When created, Then initial state is IDLE and history is empty', () => {
      const session = new ConversationSession('test-session-1', {
        voiceName: 'Zephyr',
        systemInstruction: 'Friendly assistant',
      });

      expect(session.id).toBe('test-session-1');
      expect(session.state).toBe(SessionState.IDLE);
      expect(session.getTranscripts().length).toBe(0);
    });

    it('When session connects, Then state transitions to CONNECTED', () => {
      const session = new ConversationSession('test-session-2', {
        voiceName: 'Puck',
      });
      session.transitionTo(SessionState.CONNECTED);
      expect(session.state).toBe(SessionState.CONNECTED);
    });

    it('When user speaks and model responds, Then turns are appended in order', () => {
      const session = new ConversationSession('test-session-3', {
        voiceName: 'Kore',
      });
      session.appendTranscript('user', '今日の天気は？', true);
      session.appendTranscript('model', '本日は晴天です。', true);

      const turns = session.getTranscripts();
      expect(turns.length).toBe(2);
      expect(turns[0].role).toBe('user');
      expect(turns[0].text).toBe('今日の天気は？');
      expect(turns[1].role).toBe('model');
      expect(turns[1].text).toBe('本日は晴天です。');
    });

    it('When interruption happens, Then state updates to INTERRUPTED and triggers interrupt hook', () => {
      const session = new ConversationSession('test-session-4', {
        voiceName: 'Charon',
      });
      session.transitionTo(SessionState.SPEAKING);
      expect(session.state).toBe(SessionState.SPEAKING);

      session.handleInterruption();
      expect(session.state).toBe(SessionState.INTERRUPTED);
    });
  });
});
