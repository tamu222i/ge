/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useLiveVoiceSession } from './hooks/useLiveVoiceSession.ts';
import { AudioVisualizerCanvas } from './components/AudioVisualizerCanvas.tsx';
import { VoiceSelector } from './components/VoiceSelector.tsx';
import { PersonaPresetModal } from './components/PersonaPresetModal.tsx';
import { ChatTimelineView } from './components/ChatTimelineView.tsx';
import { SessionHistorySidebar } from './components/SessionHistorySidebar.tsx';
import { VoiceControllerBar } from './components/VoiceControllerBar.tsx';
import { SessionState } from './schemas/session.ts';
import {
  Radio,
  Sliders,
  AlertCircle,
  Sparkles,
  Zap,
  History,
  Plus,
} from 'lucide-react';

export default function App() {
  const {
    sessionState,
    errorMessage,
    selectedPreset,
    customPrompt,
    voiceName,
    isMuted,
    userLevel,
    modelLevel,
    // Multi-session history & messages
    sessionSummaries,
    currentSessionId,
    currentSession,
    messages,
    createNewSession,
    selectSession,
    deleteSession,
    renameSession,
    exportSessionMarkdown,
    clearCurrentSessionMessages,
    // Operations
    applyPreset,
    setCustomPrompt,
    setVoiceName,
    startSession,
    endSession,
    interrupt,
    toggleMute,
    sendTextMessage,
    backendServerUrl,
    setBackendServerUrl,
    getInputAnalyser,
    getOutputAnalyser,
  } = useLiveVoiceSession();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);

  const isConnected =
    sessionState !== SessionState.IDLE &&
    sessionState !== SessionState.CONNECTING &&
    sessionState !== SessionState.ERROR;
  const isSpeaking = sessionState === SessionState.SPEAKING;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white truncate">
                  Gemini Live Voice Companion
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  <Zap className="w-3 h-3" /> Live 3.8
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                低遅延 双方向リアルタイム音声対話 & 時系列チャット履歴記録
              </p>
            </div>
          </div>

          {/* Right Header Navigation buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* New Session Button */}
            <button
              type="button"
              onClick={() => createNewSession()}
              disabled={isConnected}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isConnected
                  ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 cursor-pointer shadow-sm'
              }`}
              title="新しい会話セッションを開始"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新規セッション</span>
            </button>

            {/* History Sessions Drawer Button */}
            <button
              type="button"
              onClick={() => setIsHistorySidebarOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-800 bg-slate-900/70 hover:bg-slate-800 hover:border-slate-700 text-slate-200 transition cursor-pointer shadow-sm"
              title="過去のセッション履歴一覧"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>履歴</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
                {sessionSummaries.length}
              </span>
            </button>

            {/* Persona Preset Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              disabled={isConnected}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isConnected
                  ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
              }`}
              title={isConnected ? '通話中は設定を変更できません' : 'ペルソナ・プロンプト設定'}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">設定</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs sm:text-sm flex items-start gap-3 animate-fade-in shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">通信・マイクエラー: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1">
          {/* Left Column: Visualizer & Voice Controller (5 cols) */}
          <section className="lg:col-span-5 flex flex-col gap-4">
            {/* Visualizer Card */}
            <div className="relative p-5 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-sm overflow-hidden flex flex-col items-center justify-between min-h-[340px]">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-radial from-indigo-900/15 via-slate-950/0 to-transparent pointer-events-none" />

              {/* Top Status Bar inside Card */}
              <div className="w-full flex items-center justify-between z-10">
                <span className="px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/60 text-xs font-medium text-slate-300 flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  {selectedPreset.name}
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
                  {voiceName}
                </span>
              </div>

              {/* Central Waveform & Animated Voice Orb */}
              <div className="my-auto w-full flex items-center justify-center">
                <AudioVisualizerCanvas
                  userLevel={userLevel}
                  modelLevel={modelLevel}
                  sessionState={sessionState}
                  getInputAnalyser={getInputAnalyser}
                  getOutputAnalyser={getOutputAnalyser}
                />
              </div>

              {/* Helpful Tips under Visualizer */}
              <div className="text-center w-full z-10">
                <p className="text-xs text-slate-400">
                  {!isConnected ? (
                    '「リアルタイム通話を開始」を押すと、声で直接Geminiと会話できます。'
                  ) : sessionState === SessionState.SPEAKING ? (
                    'Geminiが発話中。「割り込む」ボタンを押すと即時停止して聞き役に回ります。'
                  ) : isMuted ? (
                    'マイクがミュートされています。'
                  ) : (
                    'あなたの声を聞いています。話しかけてください。'
                  )}
                </p>
              </div>
            </div>

            {/* Voice Controller Bar */}
            <VoiceControllerBar
              sessionState={sessionState}
              isMuted={isMuted}
              onStartSession={startSession}
              onEndSession={endSession}
              onToggleMute={toggleMute}
              onInterrupt={interrupt}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            {/* Voice Persona Selector */}
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
              <VoiceSelector
                currentVoice={voiceName}
                onSelectVoice={setVoiceName}
                disabled={isConnected}
              />
            </div>
          </section>

          {/* Right Column: Chronological Chat Timeline View (7 cols) */}
          <section className="lg:col-span-7 flex flex-col h-[600px] lg:h-full min-h-[500px]">
            <ChatTimelineView
              messages={messages}
              voiceName={voiceName}
              onClear={clearCurrentSessionMessages}
              onExport={exportSessionMarkdown}
              onSendText={sendTextMessage}
              isConnected={isConnected}
              isSpeaking={isSpeaking}
              sessionTitle={currentSession?.title || '会話セッション'}
            />
          </section>
        </div>
      </main>

      {/* Settings Modal */}
      <PersonaPresetModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentPreset={selectedPreset}
        customPrompt={customPrompt}
        onApplyPreset={applyPreset}
        onSaveCustomPrompt={setCustomPrompt}
        backendServerUrl={backendServerUrl}
        onSaveBackendServerUrl={setBackendServerUrl}
        disabled={isConnected}
      />

      {/* Session History Sidebar Drawer */}
      <SessionHistorySidebar
        isOpen={isHistorySidebarOpen}
        onClose={() => setIsHistorySidebarOpen(false)}
        sessions={sessionSummaries}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onNewSession={createNewSession}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        isCallActive={isConnected}
      />
    </div>
  );
}
