import { describe, it, expect, vi } from 'vitest';
import { ProtocolHandler } from '../protocol-handler.ts';
import { SessionState } from '../../schemas/session.ts';

describe('BDD: Protocol Handler & Message Dispatcher', () => {
  describe('Given a newly connected client', () => {
    it('When client sends a valid start_session message, Then starts session and returns session_started response', () => {
      const handler = new ProtocolHandler();
      const sendMock = vi.fn();

      handler.handleClientMessage(
        JSON.stringify({
          type: 'start_session',
          config: { voiceName: 'Zephyr', systemInstruction: 'Be brief' },
        }),
        sendMock
      );

      expect(sendMock).toHaveBeenCalledTimes(1);
      const response = JSON.parse(sendMock.mock.calls[0][0]);
      expect(response.type).toBe('session_started');
      expect(response.config.voiceName).toBe('Zephyr');
      expect(handler.session?.state).toBe(SessionState.CONNECTED);
    });

    it('When client sends malformed JSON, Then sends error response with INVALID_JSON code', () => {
      const handler = new ProtocolHandler();
      const sendMock = vi.fn();

      handler.handleClientMessage('{ invalid json', sendMock);

      expect(sendMock).toHaveBeenCalledTimes(1);
      const response = JSON.parse(sendMock.mock.calls[0][0]);
      expect(response.type).toBe('error');
      expect(response.code).toBe('INVALID_JSON');
    });

    it('When client sends audio before starting session, Then emits SESSION_NOT_INITIALIZED error', () => {
      const handler = new ProtocolHandler();
      const sendMock = vi.fn();

      handler.handleClientMessage(
        JSON.stringify({
          type: 'audio_chunk',
          audio: 'AAAA',
        }),
        sendMock
      );

      expect(sendMock).toHaveBeenCalledTimes(1);
      const response = JSON.parse(sendMock.mock.calls[0][0]);
      expect(response.type).toBe('error');
      expect(response.code).toBe('SESSION_NOT_INITIALIZED');
    });

    it('When client requests interrupt, Then handler triggers interruption and notifies client', () => {
      const handler = new ProtocolHandler();
      const sendMock = vi.fn();

      // Start session first
      handler.handleClientMessage(
        JSON.stringify({
          type: 'start_session',
          config: { voiceName: 'Puck' },
        }),
        sendMock
      );

      // Now interrupt
      handler.handleClientMessage(
        JSON.stringify({
          type: 'interrupt',
        }),
        sendMock
      );

      const lastResponse = JSON.parse(sendMock.mock.calls[sendMock.mock.calls.length - 1][0]);
      expect(lastResponse.type).toBe('interrupted');
      expect(handler.session?.state).toBe(SessionState.INTERRUPTED);
    });
  });
});
