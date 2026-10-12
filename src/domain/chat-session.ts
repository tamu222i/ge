import {
  ChatMessage,
  ChatMessageSchema,
  ChatSession,
  ChatSessionSchema,
} from '../schemas/chat-history.ts';
import { VoiceName } from '../schemas/session.ts';

export class ChatSessionAggregate {
  public readonly id: string;
  public title: string;
  public readonly createdAt: number;
  public updatedAt: number;
  public voiceName: VoiceName;
  public presetName: string;
  public systemInstruction?: string;
  private _messages: ChatMessage[] = [];

  constructor(params: {
    id: string;
    title?: string;
    createdAt?: number;
    updatedAt?: number;
    voiceName?: VoiceName;
    presetName?: string;
    systemInstruction?: string;
    messages?: ChatMessage[];
  }) {
    this.id = params.id;
    this.title = params.title ?? '新しいセッション';
    this.createdAt = params.createdAt ?? Date.now();
    this.updatedAt = params.updatedAt ?? this.createdAt;
    this.voiceName = params.voiceName ?? 'Zephyr';
    this.presetName = params.presetName ?? '日本語の会話パートナー';
    this.systemInstruction = params.systemInstruction;
    this._messages = params.messages ? [...params.messages] : [];
  }

  public get messages(): ReadonlyArray<ChatMessage> {
    return this._messages;
  }

  public appendMessage(msg: ChatMessage): void {
    const validated = ChatMessageSchema.parse(msg);
    this._messages.push(validated);
    this.updatedAt = Date.now();

    // Auto-derive title from first user message if title is still default
    if (this.title === '新しいセッション' && validated.role === 'user' && validated.text.trim()) {
      const trimmed = validated.text.trim();
      this.title = trimmed.length > 28 ? `${trimmed.substring(0, 28)}...` : trimmed;
    }
  }

  public appendOrUpdateStreamingModelMessage(textDelta: string, isFinal: boolean): void {
    const last = this._messages[this._messages.length - 1];
    if (last && last.role === 'model' && !last.isFinal) {
      last.text += textDelta;
      last.isFinal = isFinal;
      this.updatedAt = Date.now();
    } else {
      const newMsg: ChatMessage = {
        id: `model-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: 'model',
        text: textDelta,
        timestamp: Date.now(),
        isFinal,
      };
      this.appendMessage(newMsg);
    }
  }

  public finalizeLastModelMessage(): void {
    const last = this._messages[this._messages.length - 1];
    if (last && last.role === 'model') {
      last.isFinal = true;
      this.updatedAt = Date.now();
    }
  }

  public toJSON(): ChatSession {
    return ChatSessionSchema.parse({
      id: this.id,
      title: this.title,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      voiceName: this.voiceName,
      presetName: this.presetName,
      systemInstruction: this.systemInstruction,
      messages: this._messages,
    });
  }

  public exportToMarkdown(): string {
    const dateStr = new Date(this.createdAt).toLocaleString('ja-JP');
    let md = `# ${this.title}\n\n`;
    md += `- **作成日時**: ${dateStr}\n`;
    md += `- **ペルソナ**: ${this.presetName}\n`;
    md += `- **音声**: ${this.voiceName}\n`;
    md += `- **発話数**: ${this._messages.length} 件\n\n`;
    md += `---\n\n`;

    for (const m of this._messages) {
      const time = new Date(m.timestamp).toLocaleTimeString('ja-JP');
      const speaker = m.role === 'user' ? 'ユーザー' : `Gemini (${this.voiceName})`;
      md += `### **${speaker}** <small>(${time})</small>\n\n${m.text}\n\n`;
    }

    return md;
  }
}
