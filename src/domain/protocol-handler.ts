import {
  ClientMessageSchema,
  ClientMessage,
  ServerMessage,
  SessionState,
} from '../schemas/session.ts';
import { ConversationSession } from './session.ts';

export type SendCallback = (messageJson: string) => void;
export type AudioInputCallback = (base64Audio: string) => void;
export type TextInputCallback = (text: string) => void;

export class ProtocolHandler {
  public session: ConversationSession | null = null;
  private onAudioInput?: AudioInputCallback;
  private onTextInput?: TextInputCallback;
  private onInterrupt?: () => void;
  private onEndSession?: () => void;

  constructor(callbacks?: {
    onAudioInput?: AudioInputCallback;
    onTextInput?: TextInputCallback;
    onInterrupt?: () => void;
    onEndSession?: () => void;
  }) {
    this.onAudioInput = callbacks?.onAudioInput;
    this.onTextInput = callbacks?.onTextInput;
    this.onInterrupt = callbacks?.onInterrupt;
    this.onEndSession = callbacks?.onEndSession;
  }

  public handleClientMessage(rawMessage: string, send: SendCallback): void {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawMessage);
    } catch {
      this.sendError(send, 'INVALID_JSON', 'Payload must be a valid JSON string');
      return;
    }

    const parseResult = ClientMessageSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      this.sendError(
        send,
        'VALIDATION_ERROR',
        parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
      return;
    }

    const message: ClientMessage = parseResult.data;

    switch (message.type) {
      case 'start_session': {
        const sessionId = `live-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        this.session = new ConversationSession(sessionId, message.config);
        this.session.transitionTo(SessionState.CONNECTED);

        this.sendServerMessage(send, {
          type: 'session_started',
          sessionId: this.session.id,
          config: this.session.config,
        });
        break;
      }

      case 'audio_chunk': {
        if (!this.session) {
          this.sendError(
            send,
            'SESSION_NOT_INITIALIZED',
            'Cannot send audio before session is initialized with start_session'
          );
          return;
        }

        if (this.session.state === SessionState.CONNECTED || this.session.state === SessionState.INTERRUPTED) {
          this.session.transitionTo(SessionState.LISTENING);
        }

        if (this.onAudioInput) {
          this.onAudioInput(message.audio);
        }
        break;
      }

      case 'text_input': {
        if (!this.session) {
          this.sendError(
            send,
            'SESSION_NOT_INITIALIZED',
            'Cannot send text before session is initialized'
          );
          return;
        }

        this.session.appendTranscript('user', message.text, true);
        if (this.onTextInput) {
          this.onTextInput(message.text);
        }
        break;
      }

      case 'interrupt': {
        if (!this.session) return;
        this.session.handleInterruption();
        this.sendServerMessage(send, { type: 'interrupted' });
        if (this.onInterrupt) {
          this.onInterrupt();
        }
        break;
      }

      case 'end_session': {
        if (!this.session) return;
        this.session.transitionTo(SessionState.IDLE);
        this.sendServerMessage(send, {
          type: 'status',
          status: SessionState.IDLE,
        });
        if (this.onEndSession) {
          this.onEndSession();
        }
        this.session = null;
        break;
      }
    }
  }

  public sendServerMessage(send: SendCallback, message: ServerMessage): void {
    send(JSON.stringify(message));
  }

  public sendError(send: SendCallback, code: string, message: string): void {
    this.sendServerMessage(send, {
      type: 'error',
      code,
      message,
    });
  }
}
