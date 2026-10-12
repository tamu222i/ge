import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage } from '../schemas/chat-history.ts';
import { VoiceName } from '../schemas/session.ts';
import {
  Bot,
  User,
  Copy,
  Check,
  Trash2,
  Send,
  Download,
  ArrowDown,
  Volume2,
} from 'lucide-react';

interface ChatTimelineViewProps {
  messages: readonly ChatMessage[];
  voiceName: VoiceName;
  onClear: () => void;
  onExport: () => void;
  onSendText: (text: string) => void;
  isConnected: boolean;
  isSpeaking: boolean;
  sessionTitle: string;
}

export const ChatTimelineView: React.FC<ChatTimelineViewProps> = ({
  messages,
  voiceName,
  onClear,
  onExport,
  onSendText,
  isConnected,
  isSpeaking,
  sessionTitle,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll logic
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (!showScrollBottom) {
      scrollToBottom();
    }
  }, [messages, showScrollBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    setShowScrollBottom(!isNearBottom);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCopyAll = () => {
    const text = messages
      .map(
        (m) =>
          `[${m.role === 'user' ? 'ユーザー' : `Gemini (${voiceName})`}] (${new Date(
            m.timestamp
          ).toLocaleTimeString('ja-JP')}):\n${m.text}`
      )
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendText(inputText.trim());
    setInputText('');
    setShowScrollBottom(false);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/90">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-100 truncate">{sessionTitle}</h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>{messages.length} メッセージ</span>
              <span>•</span>
              <span className="font-mono text-indigo-300">Voice: {voiceName}</span>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {messages.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopyAll}
                title="会話全体をコピー"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition text-xs flex items-center gap-1 cursor-pointer"
              >
                {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onExport}
                title="Markdownとしてエクスポート"
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition text-xs flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClear}
                title="このセッションのメッセージを全消去"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition text-xs flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Timeline Scroll Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 min-h-[300px] scrollbar-thin scrollbar-thumb-slate-800 relative"
      >
        {messages.length === 0 ? (
          <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/50 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mb-1">
              <Bot className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">会話履歴がありません</p>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              「リアルタイム通話を開始」を押してマイクで話しかけるか、下の入力欄からメッセージを送信してください。発話内容は時系列で自動保存されます。
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            const isCopied = copiedId === m.id;

            return (
              <div
                key={m.id}
                className={`flex gap-3 group animate-fade-in ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Gemini Avatar */}
                {!isUser && (
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                      isSpeaking
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-500/50'
                        : 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300'
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${
                    isUser ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Speaker Label & Time */}
                  <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">
                      {isUser ? 'あなた' : `Gemini (${voiceName})`}
                    </span>
                    <span className="font-mono text-slate-500">{formatTime(m.timestamp)}</span>
                    {!isUser && !m.isFinal && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 animate-pulse">
                        <Volume2 className="w-3 h-3" /> 発話中...
                      </span>
                    )}
                  </div>

                  {/* Bubble Content */}
                  <div
                    className={`relative rounded-2xl px-4 py-3 leading-relaxed shadow-sm text-sm ${
                      isUser
                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-xs border border-indigo-500/40'
                        : 'bg-slate-800/90 text-slate-100 rounded-tl-xs border border-slate-700/60'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>

                    {/* Quick copy button */}
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(m.id, m.text)}
                      title="このメッセージをコピー"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 rounded-md bg-slate-900/70 hover:bg-slate-900 text-slate-300 text-xs"
                    >
                      {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center shrink-0 text-emerald-300">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Scroll to bottom float button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-slate-800/95 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs shadow-lg flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>最新メッセージへ</span>
          </button>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3 border-t border-slate-800/80 bg-slate-900/80 flex items-center gap-2.5"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isConnected
              ? '声で会話しながらテキストも送信できます...'
              : 'メッセージを入力してGeminiに送信...'
          }
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">送信</span>
        </button>
      </form>
    </div>
  );
};
