import { describe, it, expect, beforeEach } from 'vitest';
import {
  ChatMessageSchema,
  ChatSessionSchema,
  ChatMessage,
} from '../../schemas/chat-history.ts';
import { ChatSessionAggregate } from '../chat-session.ts';
import { SessionRepository } from '../session-repository.ts';

describe('BDD: ChatSession Domain & Schema', () => {
  describe('Given ChatMessage data', () => {
    it('When parsed by ChatMessageSchema, Then validates role, text, and timestamp', () => {
      const validMsg = ChatMessageSchema.parse({
        id: 'msg-1',
        role: 'user',
        text: 'こんにちは、今日の予定を教えて。',
        timestamp: 1710000000000,
        isFinal: true,
      });

      expect(validMsg.role).toBe('user');
      expect(validMsg.text).toBe('こんにちは、今日の予定を教えて。');
      expect(validMsg.isFinal).toBe(true);
    });

    it('When role is invalid, Then rejects with validation error', () => {
      expect(() => {
        ChatMessageSchema.parse({
          id: 'msg-2',
          role: 'unknown_role',
          text: 'test',
          timestamp: Date.now(),
        });
      }).toThrow();
    });
  });

  describe('Given ChatSessionAggregate', () => {
    it('When user and model messages are added, Then maintains chronological order and auto-generates title', () => {
      const session = new ChatSessionAggregate({
        id: 'sess-1',
        voiceName: 'Zephyr',
        presetName: '日本語の会話パートナー',
      });

      expect(session.title).toBe('新しいセッション');
      expect(session.messages.length).toBe(0);

      // Add user turn
      session.appendMessage({
        id: 'm1',
        role: 'user',
        text: '自己紹介してください。',
        timestamp: 1000,
        isFinal: true,
      });

      // Title should automatically adapt from the first user prompt
      expect(session.title).toBe('自己紹介してください。');
      expect(session.messages.length).toBe(1);

      // Add model turn
      session.appendMessage({
        id: 'm2',
        role: 'model',
        text: '私はGeminiです。よろしくお願いします！',
        timestamp: 2000,
        isFinal: true,
      });

      expect(session.messages.length).toBe(2);
      expect(session.messages[0].role).toBe('user');
      expect(session.messages[1].role).toBe('model');
    });

    it('When model message streams in deltas, Then updates last unfinalized turn in-place', () => {
      const session = new ChatSessionAggregate({ id: 'sess-2' });

      session.appendMessage({
        id: 'm1',
        role: 'user',
        text: '天気予報',
        timestamp: 1000,
        isFinal: true,
      });

      session.appendOrUpdateStreamingModelMessage('今日は', false);
      expect(session.messages.length).toBe(2);
      expect(session.messages[1].text).toBe('今日は');
      expect(session.messages[1].isFinal).toBe(false);

      session.appendOrUpdateStreamingModelMessage('晴天です。', true);
      expect(session.messages.length).toBe(2);
      expect(session.messages[1].text).toBe('今日は晴天です。');
      expect(session.messages[1].isFinal).toBe(true);
    });

    it('When exported to Markdown, Then formats cleanly with timestamps and speakers', () => {
      const session = new ChatSessionAggregate({
        id: 'sess-export',
        title: '天気相談',
        voiceName: 'Puck',
      });
      session.appendMessage({
        id: '1',
        role: 'user',
        text: '雨は降る？',
        timestamp: 1710000000000,
        isFinal: true,
      });
      session.appendMessage({
        id: '2',
        role: 'model',
        text: '降水確率は10%です。',
        timestamp: 1710000005000,
        isFinal: true,
      });

      const md = session.exportToMarkdown();
      expect(md).toContain('# 天気相談');
      expect(md).toContain('**ユーザー**');
      expect(md).toContain('雨は降る？');
      expect(md).toContain('**Gemini (Puck)**');
      expect(md).toContain('降水確率は10%です。');
    });
  });

  describe('Given SessionRepository', () => {
    let repo: SessionRepository;

    beforeEach(() => {
      // Clear repository storage
      repo = new SessionRepository({ inMemoryOnly: true });
    });

    it('When saving and listing sessions, Then retrieves all sessions ordered by updatedAt descending', () => {
      const sess1 = new ChatSessionAggregate({
        id: 's-1',
        title: 'Session 1',
        updatedAt: 1000,
      });
      const sess2 = new ChatSessionAggregate({
        id: 's-2',
        title: 'Session 2',
        updatedAt: 2000,
      });

      repo.save(sess1.toJSON());
      repo.save(sess2.toJSON());

      const list = repo.listAll();
      expect(list.length).toBe(2);
      expect(list[0].id).toBe('s-2'); // More recent first
      expect(list[1].id).toBe('s-1');
    });

    it('When deleting a session, Then removes it from storage', () => {
      const sess = new ChatSessionAggregate({ id: 's-delete' });
      repo.save(sess.toJSON());
      expect(repo.getById('s-delete')).not.toBeNull();

      repo.delete('s-delete');
      expect(repo.getById('s-delete')).toBeNull();
    });
  });
});
