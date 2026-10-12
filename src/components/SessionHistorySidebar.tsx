import React, { useState } from 'react';
import { SessionSummary } from '../schemas/chat-history.ts';
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  History,
  Calendar,
} from 'lucide-react';

interface SessionHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionSummary[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  isCallActive: boolean;
}

export const SessionHistorySidebar: React.FC<SessionHistorySidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  isCallActive,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.presetName.toLowerCase().includes(q) ||
      (s.previewText && s.previewText.toLowerCase().includes(q))
    );
  });

  const handleStartRename = (s: SessionSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditingTitle(s.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('この会話セッションを削除しますか？')) {
      onDeleteSession(id);
    }
  };

  const formatRelativeTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    if (isToday) {
      return `今日 ${d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full animate-slide-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">対話セッション履歴</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action: New Session button */}
        <div className="p-4 border-b border-slate-800 flex flex-col gap-3 bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              onNewSession();
              onClose();
            }}
            disabled={isCallActive}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20 ${
              isCallActive
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer hover:scale-[1.01]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>新しいセッションを開始</span>
          </button>

          {isCallActive && (
            <p className="text-[11px] text-amber-400 text-center">
              ※ 通話中はセッションの切り替えはできません。通話終了後に行ってください。
            </p>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="過去のセッションを検索..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
          {filteredSessions.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-500 gap-2">
              <MessageSquare className="w-8 h-8 text-slate-700" />
              <p className="text-xs text-slate-400">該当するセッションが見つかりません</p>
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isSelected = s.id === currentSessionId;
              const isEditing = editingId === s.id;

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (!isCallActive && !isEditing) {
                      onSelectSession(s.id);
                      onClose();
                    }
                  }}
                  className={`group relative p-3 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500/50'
                      : 'border-slate-800/80 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-900/60'
                  } ${isCallActive ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {/* Title & Edit Row */}
                  <div className="flex items-center justify-between gap-2">
                    {isEditing ? (
                      <div
                        className="flex items-center gap-1 flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="flex-1 bg-slate-950 border border-indigo-500 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveRename(s.id, e)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          className="p-1 text-slate-400 hover:text-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className={`text-xs font-bold truncate flex-1 ${
                            isSelected ? 'text-indigo-200' : 'text-slate-200'
                          }`}
                        >
                          {s.title}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(s, e)}
                            title="タイトル変更"
                            className="p-1 text-slate-400 hover:text-slate-200 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(s.id, e)}
                            title="削除"
                            className="p-1 text-slate-400 hover:text-rose-400 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {formatRelativeTime(s.updatedAt)}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {s.voiceName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 text-[10px]">
                        {s.messageCount}件
                      </span>
                    </div>
                  </div>

                  {/* Preview Snippet */}
                  {s.previewText && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                      "{s.previewText}"
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 text-center text-[11px] text-slate-500 bg-slate-900/90">
          全 {sessions.length} 件の会話セッションが保存されています
        </div>
      </div>
    </div>
  );
};
