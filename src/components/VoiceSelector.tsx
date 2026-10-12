import React from 'react';
import { VoiceName } from '../schemas/session.ts';
import { Sparkles, Volume2 } from 'lucide-react';

interface VoiceOption {
  name: VoiceName;
  label: string;
  tone: string;
  color: string;
}

const VOICE_OPTIONS: VoiceOption[] = [
  {
    name: 'Zephyr',
    label: 'Zephyr (ゼファー)',
    tone: '温かみのある自然な声',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    name: 'Puck',
    label: 'Puck (パック)',
    tone: '明るく元気な親しみやすい声',
    color: 'from-amber-500 to-orange-600',
  },
  {
    name: 'Charon',
    label: 'Charon (カロン)',
    tone: '落ち着いた深みのある低音',
    color: 'from-purple-500 to-slate-700',
  },
  {
    name: 'Kore',
    label: 'Kore (コレ)',
    tone: '知性的でクリアな発声',
    color: 'from-emerald-500 to-teal-700',
  },
  {
    name: 'Fenrir',
    label: 'Fenrir (フェンリル)',
    tone: '重厚感のある物語調の声',
    color: 'from-rose-500 to-indigo-800',
  },
];

interface VoiceSelectorProps {
  currentVoice: VoiceName;
  onSelectVoice: (voice: VoiceName) => void;
  disabled?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  currentVoice,
  onSelectVoice,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        音声ペルソナ選択 (Gemini 3.8 Prebuilt Voice)
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {VOICE_OPTIONS.map((v) => {
          const isSelected = currentVoice === v.name;
          return (
            <button
              key={v.name}
              type="button"
              disabled={disabled}
              onClick={() => onSelectVoice(v.name)}
              className={`relative text-left p-2.5 rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/40 shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-500/50'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold ${
                    isSelected ? 'text-indigo-300' : 'text-slate-200'
                  }`}
                >
                  {v.name}
                </span>
                <Volume2
                  className={`w-3.5 h-3.5 ${
                    isSelected ? 'text-indigo-400' : 'text-slate-600'
                  }`}
                />
              </div>
              <p className="text-[11px] leading-tight text-slate-400 line-clamp-1">{v.tone}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
