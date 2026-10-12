import React, { useRef, useEffect, useState } from 'react';
import { TranscriptTurn } from '../schemas/session.ts';
import { Bot, User, Copy, Check, Trash2, Send } from 'lucide-react';

interface TranscriptFeedProps {
  transcripts: TranscriptTurn[];
  onClear: () => void;
  onSendText?: (text: string) => void;
  isConnected: boolean;
}

export const TranscriptFeed: React.FC<TranscriptFeedProps> = ({
  transcripts,
  onClear,
  onSendText,
  isConnected,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [inputVal, setInputVal] = useState('');

  // Auto-scroll to bottom on new transcripts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const handleCopy = () => {
    const text = transcripts
      .map((t) => `[${t.role === 'user' ? 'あなた' : 'Gemini'}]: ${t.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !onSendText) return;
    onSendText(inputVal);
    setInputVal('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            対話ログ & 書き起こし
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {transcripts.length} 発話
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {transcripts.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                title="会話テキストをコピー"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition text-xs flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onClear}
                title="ログをクリア"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-[220px] max-h-[380px] scrollbar-thin scrollbar-thumb-slate-800"
      >
        {transcripts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 gap-2">
            <Bot className="w-8 h-8 text-slate-700 mb-1" />
            <p className="text-sm font-medium text-slate-400">リアルタイム会話のログがここに表示されます</p>
            <p className="text-xs text-slate-600 max-w-xs">
              マイクに向かって話しかけると、音声の送受信と並行してGeminiの応答がリアルタイムに表示されます。
            </p>
          </div>
        ) : (
          transcripts.map((t) => {
            const isUser = t.role === 'user';
            return (
              <div
                key={t.id}
                className={`flex gap-3 text-sm animate-fade-in ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-300">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-800/80 text-slate-100 rounded-bl-xs border border-slate-700/50'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{t.text}</p>
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-300">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Optional Text Input for hybrid interaction */}
      {isConnected && onSendText && (
        <form
          onSubmit={handleTextSubmit}
          className="p-2.5 border-t border-slate-800/80 bg-slate-900/60 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="テキストでも話しかけられます..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
