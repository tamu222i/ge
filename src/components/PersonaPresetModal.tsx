import React, { useState } from 'react';
import { PersonaPreset, PRESET_PERSONAS } from '../hooks/useLiveVoiceSession.ts';
import { X, Sliders, Check, RotateCcw } from 'lucide-react';

interface PersonaPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreset: PersonaPreset;
  customPrompt: string;
  onApplyPreset: (preset: PersonaPreset) => void;
  onSaveCustomPrompt: (prompt: string) => void;
  backendServerUrl?: string;
  onSaveBackendServerUrl?: (url: string) => void;
  disabled?: boolean;
}

export const PersonaPresetModal: React.FC<PersonaPresetModalProps> = ({
  isOpen,
  onClose,
  currentPreset,
  customPrompt,
  onApplyPreset,
  onSaveCustomPrompt,
  backendServerUrl = '',
  onSaveBackendServerUrl,
  disabled = false,
}) => {
  const [tempPrompt, setTempPrompt] = useState(customPrompt);
  const [tempServerUrl, setTempServerUrl] = useState(backendServerUrl);

  if (!isOpen) return null;

  const handleSelectPreset = (p: PersonaPreset) => {
    onApplyPreset(p);
    setTempPrompt(p.systemInstruction);
  };

  const handleSave = () => {
    onSaveCustomPrompt(tempPrompt);
    onSaveBackendServerUrl?.(tempServerUrl);
    onClose();
  };

  const handleResetToPreset = () => {
    setTempPrompt(currentPreset.systemInstruction);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">対話ペルソナ & プロンプト設定</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Cards */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            プリセットを選択
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESET_PERSONAS.map((p) => {
              const isSelected = currentPreset.id === p.id;
              return (
                <button
                  key={p.id}
                  disabled={disabled}
                  onClick={() => handleSelectPreset(p)}
                  className={`text-left p-3 rounded-xl border transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/50'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-200">{p.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
                  <span className="mt-2 text-[10px] font-mono text-indigo-300">
                    Voice: {p.voiceName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* System Instruction Prompt Textarea */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              システムインストラクション (AIへの振る舞い指示)
            </label>
            <button
              type="button"
              onClick={handleResetToPreset}
              className="text-xs text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              プリセット規定値に戻す
            </button>
          </div>
          <textarea
            rows={4}
            value={tempPrompt}
            onChange={(e) => setTempPrompt(e.target.value)}
            disabled={disabled}
            placeholder="Geminiの話し方や役割、応答のテンポを入力してください..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono leading-relaxed resize-none"
          />
          <p className="text-[11px] text-slate-500">
            ※音声対話では、1回の発話を1〜2文程度に短くまとめる指示を入れると、人間同士のような心地よいテンポの掛け合いになります。
          </p>
        </div>

        {/* Backend Server Configuration (GitHub Pages / External Hosting) */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>バックエンドサーバー設定 (GitHub Pages / 外部接続用)</span>
            <span className="text-[10px] text-indigo-400 font-normal lowercase">WebSocket Relay</span>
          </label>
          <input
            type="text"
            value={tempServerUrl}
            onChange={(e) => setTempServerUrl(e.target.value)}
            disabled={disabled}
            placeholder="未設定（同一オリジンまたはデフォルトCloud Runに自動接続）"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono transition"
          />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            GitHub Pages などの静的ホスティング時は、Gemini Live API と通信するバックエンドURL（例: Cloud Run サービスURL）へ自動接続します。空欄の場合は標準のサーバーへ接続されます。
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
};
