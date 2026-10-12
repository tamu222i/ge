import {
  SessionConfig,
  SessionConfigSchema,
  SessionState,
  TranscriptTurn,
} from '../schemas/session.ts';

export class ConversationSession {
  public readonly id: string;
  public readonly config: SessionConfig;
  private _state: SessionState = SessionState.IDLE;
  private _transcripts: TranscriptTurn[] = [];

  constructor(id: string, initialConfig?: Partial<SessionConfig>) {
    this.id = id;
    this.config = SessionConfigSchema.parse(initialConfig ?? {});
  }

  public get state(): SessionState {
    return this._state;
  }

  public transitionTo(newState: SessionState): void {
    this._state = newState;
  }

  public appendTranscript(
    role: 'user' | 'model' | 'system',
    text: string,
    isFinal = false
  ): TranscriptTurn {
    const turn: TranscriptTurn = {
      id: `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role,
      text,
      isFinal,
      timestamp: Date.now(),
    };
    this._transcripts.push(turn);
    return turn;
  }

  public updateLastModelTranscript(textDelta: string): void {
    const last = this._transcripts[this._transcripts.length - 1];
    if (last && last.role === 'model' && !last.isFinal) {
      last.text += textDelta;
    } else {
      this.appendTranscript('model', textDelta, false);
    }
  }

  public finalizeModelTranscript(): void {
    const last = this._transcripts[this._transcripts.length - 1];
    if (last && last.role === 'model') {
      last.isFinal = true;
    }
  }

  public handleInterruption(): void {
    this.finalizeModelTranscript();
    this.transitionTo(SessionState.INTERRUPTED);
  }

  public getTranscripts(): ReadonlyArray<TranscriptTurn> {
    return [...this._transcripts];
  }

  public clearTranscripts(): void {
    this._transcripts = [];
  }
}
