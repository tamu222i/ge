import { ChatSession, ChatSessionSchema, SessionSummary } from '../schemas/chat-history.ts';

const STORAGE_KEY = 'gemini_live_chat_sessions_v1';

export interface RepositoryOptions {
  inMemoryOnly?: boolean;
}

export class SessionRepository {
  private inMemoryStore: Map<string, ChatSession> = new Map();
  private inMemoryOnly: boolean;

  constructor(options?: RepositoryOptions) {
    this.inMemoryOnly = options?.inMemoryOnly ?? false;
  }

  private isStorageAvailable(): boolean {
    if (this.inMemoryOnly) return false;
    try {
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  private readAllFromStorage(): ChatSession[] {
    if (!this.isStorageAvailable()) {
      return Array.from(this.inMemoryStore.values());
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => ChatSessionSchema.parse(item));
    } catch (err) {
      console.warn('[SessionRepository] Error reading sessions from storage:', err);
      return [];
    }
  }

  private writeAllToStorage(sessions: ChatSession[]): void {
    if (!this.isStorageAvailable()) {
      this.inMemoryStore.clear();
      for (const s of sessions) {
        this.inMemoryStore.set(s.id, s);
      }
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.warn('[SessionRepository] Error writing sessions to storage:', err);
    }
  }

  public listAll(): SessionSummary[] {
    const all = this.readAllFromStorage();
    return all
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        voiceName: s.voiceName,
        presetName: s.presetName,
        messageCount: s.messages.length,
        previewText: s.messages.length > 0 ? s.messages[s.messages.length - 1].text : undefined,
      }));
  }

  public getById(id: string): ChatSession | null {
    const all = this.readAllFromStorage();
    const found = all.find((s) => s.id === id);
    return found ?? null;
  }

  public save(session: ChatSession): void {
    const validated = ChatSessionSchema.parse(session);
    const all = this.readAllFromStorage();
    const index = all.findIndex((s) => s.id === validated.id);

    if (index >= 0) {
      all[index] = validated;
    } else {
      all.unshift(validated);
    }

    this.writeAllToStorage(all);
  }

  public delete(id: string): void {
    const all = this.readAllFromStorage();
    const filtered = all.filter((s) => s.id !== id);
    this.writeAllToStorage(filtered);
  }

  public clearAll(): void {
    this.writeAllToStorage([]);
  }
}
