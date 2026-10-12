import React from 'react';
import { SessionState } from '../schemas/session.ts';
import { Phone, PhoneOff, Mic, MicOff, Hand, Loader2 } from 'lucide-react';

interface VoiceControllerBarProps {
  sessionState: SessionState;
  isMuted: boolean;
  onStartSession: () => void;
  onEndSession: () => void;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onOpenSettings: () => void;
}

export const VoiceControllerBar: React.FC<VoiceControllerBarProps> = ({
  sessionState,
  isMuted,
  onStartSession,
  onEndSession,
  onToggleMute,
  onInterrupt,
}) => {
  const isConnected =
    sessionState !== SessionState.IDLE &&
    sessionState !== SessionState.CONNECTING &&
    sessionState !== SessionState.ERROR;
  const isConnecting = sessionState === SessionState.CONNECTING;
  const isModelSpeaking = sessionState === SessionState.SPEAKING;

  return (
    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
      {/* Left: Connection State Badge */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          <span
            className={`w-3 h-3 rounded-full ${
              isConnected
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500'
                : isConnecting
                ? 'bg-amber-500 animate-ping'
                : 'bg-slate-600'
            }`}
          />
          {isConnected && (
            <span className="absolute w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-200">
            {isConnecting
              ? 'Gemini Liveに接続中...'
              : isConnected
              ? isModelSpeaking
                ? 'Geminiが音声応答中'
                : isMuted
                ? 'マイクミュート中'
                : '双方向リアルタイム接続中'
              : '通話待機中'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Model: gemini-3.8-live (16kHz in / 24kHz out)
          </span>
        </div>
      </div>

      {/* Center / Right: Action Controls */}
      <div className="flex items-center gap-3">
        {/* Mute Button (Enabled during call) */}
        {isConnected && (
          <button
            type="button"
            onClick={onToggleMute}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isMuted
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/40'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
            title={isMuted ? 'ミュート解除' : 'マイクをミュート'}
          >
            {isMuted ? <MicOff className="w-4 h-4 text-amber-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? 'ミュート中' : 'マイクON'}</span>
          </button>
        )}

        {/* Interrupt Button (Highlighted when model is speaking) */}
        {isConnected && (
          <button
            type="button"
            onClick={onInterrupt}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isModelSpeaking
                ? 'bg-purple-950/60 border-purple-500 text-purple-200 shadow-md shadow-purple-900/40 ring-1 ring-purple-500 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Geminiの発話を中断してユーザーの発話に切り替え"
          >
            <Hand className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">割り込む</span>
          </button>
        )}

        {/* Primary Call / End Button */}
        {!isConnected ? (
          <button
            type="button"
            disabled={isConnecting}
            onClick={onStartSession}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>接続中...</span>
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                <span>リアルタイム通話を開始</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onEndSession}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>通話を終了</span>
          </button>
        )}
      </div>
    </div>
  );
};
