import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioManager } from '../infrastructure/audio-manager.ts';
import { BrowserSpeechRecognizer } from '../infrastructure/speech-recognizer.ts';
import {
  SessionState,
  ServerMessageSchema,
  VoiceName,
} from '../schemas/session.ts';
import { ChatMessage, SessionSummary, ChatSession } from '../schemas/chat-history.ts';
import { ChatSessionAggregate } from '../domain/chat-session.ts';
import { SessionRepository } from '../domain/session-repository.ts';
import { resolveLiveWebSocketUrl } from '../utils/url-resolver.ts';

export interface PersonaPreset {
  id: string;
  name: string;
  voiceName: VoiceName;
  description: string;
  systemInstruction: string;
}

export const PRESET_PERSONAS: PersonaPreset[] = [
  {
    id: 'japanese_buddy',
    name: '日本語の会話パートナー',
    voiceName: 'Zephyr',
    description: '親しみやすく自然な日本語で相槌を打ちながら会話するフレンドリーな相棒',
    systemInstruction:
      'あなたは親しみやすい日本の友人「ゼファー」です。ユーザーと自然な日本語でテンポよく雑談してください。一言二言の短くリズミカルな相槌や返答を心がけ、音声対話が心地よくテンポよく続くようにしてください。',
  },
  {
    id: 'english_tutor',
    name: 'English Conversation Tutor',
    voiceName: 'Puck',
    description: 'Friendly native speaker who practices daily English and gently guides pronunciation',
    systemInstruction:
      'You are Puck, an energetic and encouraging English conversation tutor. Speak clear, conversational English, praise the learner, and keep each reply brief (1-2 sentences) to encourage the user to speak frequently.',
  },
  {
    id: 'tech_interviewer',
    name: 'IT技術面接官',
    voiceName: 'Charon',
    description: '落ち着いたトーンでエンジニアリングの質問と深掘りを行う模擬面接官',
    systemInstruction:
      'あなたは経験豊富なシニアテックリード兼面接官「カロン」です。落ち着いた誠実な口調で、ソフトウェア設計やアーキテクチャについての模擬面接を行います。1回につき質問を1つ投げかけ、ユーザーの回答を待ちます。',
  },
  {
    id: 'concierge',
    name: 'スマートアシスタント',
    voiceName: 'Kore',
    description: '知性的でクリアな発話で的確に質問に答えるプロフェッショナル秘書',
    systemInstruction:
      'あなたは知的で頼もしいAIアシスタント「コレ」です。簡潔かつ明瞭に要点を伝え、質問に対して的確でプロフェッショナルな情報提供を行ってください。',
  },
  {
    id: 'storyteller',
    name: 'ストーリーテラー',
    voiceName: 'Fenrir',
    description: '深みのある落ち着いた声で即興の物語や解説を紡ぐ語り手',
    systemInstruction:
      'あなたは物語の語り手「フェンリル」です。深みと臨場感のある語り口で、ユーザーのテーマに合わせた情景描写豊かなショートストーリーを語ってください。',
  },
];

const repository = new SessionRepository();

export function useLiveVoiceSession() {
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Configuration state
  const [selectedPreset, setSelectedPreset] = useState<PersonaPreset>(PRESET_PERSONAS[0]);
  const [customPrompt, setCustomPrompt] = useState<string>(PRESET_PERSONAS[0].systemInstruction);
  const [voiceName, setVoiceName] = useState<VoiceName>(PRESET_PERSONAS[0].voiceName);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [backendServerUrl, setBackendServerUrlState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gemini_live_server_url') || '';
    }
    return '';
  });

  const setBackendServerUrl = useCallback((url: string) => {
    setBackendServerUrlState(url);
    if (typeof window !== 'undefined') {
      if (url.trim()) {
        localStorage.setItem('gemini_live_server_url', url.trim());
      } else {
        localStorage.removeItem('gemini_live_server_url');
      }
    }
  }, []);

  // Multi-session history state
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);

  // Audio meter volume levels (0.0 to 1.0)
  const [userLevel, setUserLevel] = useState<number>(0);
  const [modelLevel, setModelLevel] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const speechRecognizerRef = useRef<BrowserSpeechRecognizer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const aggregateRef = useRef<ChatSessionAggregate | null>(null);

  // Refresh sessions list from repository
  const refreshSessionList = useCallback(() => {
    const list = repository.listAll();
    setSessionSummaries(list);
  }, []);

  // Initialize or load current session
  const loadOrCreateSession = useCallback(
    (targetId?: string) => {
      refreshSessionList();
      const all = repository.listAll();

      let targetSession: ChatSession | null = null;
      if (targetId) {
        targetSession = repository.getById(targetId);
      } else if (all.length > 0) {
        targetSession = repository.getById(all[0].id);
      }

      if (!targetSession) {
        // Create initial default session
        const newId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const initialAgg = new ChatSessionAggregate({
          id: newId,
          voiceName: selectedPreset.voiceName,
          presetName: selectedPreset.name,
          systemInstruction: selectedPreset.systemInstruction,
        });
        targetSession = initialAgg.toJSON();
        repository.save(targetSession);
        aggregateRef.current = initialAgg;
      } else {
        aggregateRef.current = new ChatSessionAggregate(targetSession);
      }

      setCurrentSessionId(targetSession.id);
      setCurrentSession(targetSession);
      refreshSessionList();
    },
    [refreshSessionList, selectedPreset]
  );

  useEffect(() => {
    loadOrCreateSession();
  }, [loadOrCreateSession]);

  // Sync state helper to update current session state and repository
  const syncAggregate = useCallback(() => {
    if (aggregateRef.current) {
      const json = aggregateRef.current.toJSON();
      repository.save(json);
      setCurrentSession(json);
      refreshSessionList();
    }
  }, [refreshSessionList]);

  // Create brand new session
  const createNewSession = useCallback(
    (preset?: PersonaPreset) => {
      const activePreset = preset || selectedPreset;
      const newId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newAgg = new ChatSessionAggregate({
        id: newId,
        voiceName: activePreset.voiceName,
        presetName: activePreset.name,
        systemInstruction: activePreset.systemInstruction,
      });

      aggregateRef.current = newAgg;
      const json = newAgg.toJSON();
      repository.save(json);

      setCurrentSessionId(newId);
      setCurrentSession(json);
      setSelectedPreset(activePreset);
      setVoiceName(activePreset.voiceName);
      setCustomPrompt(activePreset.systemInstruction);
      refreshSessionList();
    },
    [refreshSessionList, selectedPreset]
  );

  // Switch to another existing session
  const selectSession = useCallback(
    (id: string) => {
      if (sessionState !== SessionState.IDLE) {
        return; // prevent switching in middle of active call
      }
      const loaded = repository.getById(id);
      if (loaded) {
        aggregateRef.current = new ChatSessionAggregate(loaded);
        setCurrentSessionId(loaded.id);
        setCurrentSession(loaded);
        // Find matching preset if applicable
        const matchingPreset = PRESET_PERSONAS.find((p) => p.name === loaded.presetName);
        if (matchingPreset) setSelectedPreset(matchingPreset);
        setVoiceName(loaded.voiceName);
        if (loaded.systemInstruction) setCustomPrompt(loaded.systemInstruction);
      }
    },
    [sessionState]
  );

  // Delete a session
  const deleteSession = useCallback(
    (id: string) => {
      repository.delete(id);
      refreshSessionList();
      if (currentSessionId === id) {
        loadOrCreateSession();
      }
    },
    [currentSessionId, loadOrCreateSession, refreshSessionList]
  );

  // Update session title
  const renameSession = useCallback(
    (id: string, newTitle: string) => {
      const loaded = repository.getById(id);
      if (loaded) {
        loaded.title = newTitle;
        loaded.updatedAt = Date.now();
        repository.save(loaded);
        if (currentSessionId === id && aggregateRef.current) {
          aggregateRef.current.title = newTitle;
          setCurrentSession({ ...loaded });
        }
        refreshSessionList();
      }
    },
    [currentSessionId, refreshSessionList]
  );

  // Export current session as Markdown file
  const exportSessionMarkdown = useCallback(() => {
    if (!aggregateRef.current) return;
    const md = aggregateRef.current.exportToMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${aggregateRef.current.title || 'conversation'}-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Clear all messages in current session
  const clearCurrentSessionMessages = useCallback(() => {
    if (aggregateRef.current) {
      const cleared = new ChatSessionAggregate({
        id: aggregateRef.current.id,
        title: aggregateRef.current.title,
        createdAt: aggregateRef.current.createdAt,
        voiceName: aggregateRef.current.voiceName,
        presetName: aggregateRef.current.presetName,
        systemInstruction: aggregateRef.current.systemInstruction,
        messages: [],
      });
      aggregateRef.current = cleared;
      syncAggregate();
    }
  }, [syncAggregate]);

  // Sync preset changes
  const applyPreset = useCallback(
    (preset: PersonaPreset) => {
      setSelectedPreset(preset);
      setVoiceName(preset.voiceName);
      setCustomPrompt(preset.systemInstruction);
      if (aggregateRef.current && sessionState === SessionState.IDLE) {
        aggregateRef.current.presetName = preset.name;
        aggregateRef.current.voiceName = preset.voiceName;
        aggregateRef.current.systemInstruction = preset.systemInstruction;
        syncAggregate();
      }
    },
    [sessionState, syncAggregate]
  );

  // Visualizer meter animation loop
  const startVolumeMeterLoop = useCallback(() => {
    const inputAnalyser = audioManagerRef.current?.getInputAnalyser();
    const outputAnalyser = audioManagerRef.current?.getOutputAnalyser();

    const inputData = new Uint8Array(128);
    const outputData = new Uint8Array(128);

    const updateLevels = () => {
      if (inputAnalyser) {
        inputAnalyser.getByteFrequencyData(inputData);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i];
        const avg = sum / inputData.length / 255;
        setUserLevel(avg);
      } else {
        setUserLevel(0);
      }

      if (outputAnalyser) {
        outputAnalyser.getByteFrequencyData(outputData);
        let sum = 0;
        for (let i = 0; i < outputData.length; i++) sum += outputData[i];
        const avg = sum / outputData.length / 255;
        setModelLevel(avg);
      } else {
        setModelLevel(0);
      }

      animationFrameRef.current = requestAnimationFrame(updateLevels);
    };

    updateLevels();
  }, []);

  const stopVolumeMeterLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setUserLevel(0);
    setModelLevel(0);
  }, []);

  // End Session & cleanup
  const endSession = useCallback(() => {
    stopVolumeMeterLoop();

    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop();
      speechRecognizerRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'end_session' }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioManagerRef.current) {
      audioManagerRef.current.stop();
      audioManagerRef.current = null;
    }

    if (aggregateRef.current) {
      aggregateRef.current.finalizeLastModelMessage();
      syncAggregate();
    }

    setSessionState(SessionState.IDLE);
    setIsMuted(false);
  }, [stopVolumeMeterLoop, syncAggregate]);

  // Interrupt AI speech
  const interrupt = useCallback(() => {
    if (audioManagerRef.current) {
      audioManagerRef.current.stopAudioPlayback();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    if (aggregateRef.current) {
      aggregateRef.current.finalizeLastModelMessage();
      syncAggregate();
    }
    setSessionState(SessionState.INTERRUPTED);
  }, [syncAggregate]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (!audioManagerRef.current) return;
    const nextMute = !isMuted;
    audioManagerRef.current.setMuted(nextMute);
    setIsMuted(nextMute);
  }, [isMuted]);

  // Start Live Session
  const startSession = useCallback(async () => {
    try {
      setErrorMessage(null);
      setSessionState(SessionState.CONNECTING);

      // Ensure active aggregate exists
      if (!aggregateRef.current) {
        aggregateRef.current = new ChatSessionAggregate({
          id: currentSessionId || `sess-${Date.now()}`,
          voiceName,
          presetName: selectedPreset.name,
          systemInstruction: customPrompt,
        });
      }

      // 1. Initialize Audio Manager
      const audioManager = new AudioManager({
        onAudioChunk: (base64Audio) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'audio_chunk',
                audio: base64Audio,
              })
            );
          }
        },
        onError: (err) => {
          setErrorMessage(`マイク初期化エラー: ${err.message}`);
          endSession();
        },
      });

      audioManagerRef.current = audioManager;
      await audioManager.startRecording();

      // 2. Setup Optional Browser Speech Recognition for rapid user speech capture
      const speechRecognizer = new BrowserSpeechRecognizer({
        onInterimText: (text) => {
          if (!aggregateRef.current) return;
          const messages = aggregateRef.current.messages;
          const last = messages[messages.length - 1];
          if (last && last.role === 'user' && !last.isFinal) {
            last.text = text;
          } else {
            aggregateRef.current.appendMessage({
              id: `user-speech-${Date.now()}`,
              role: 'user',
              text,
              timestamp: Date.now(),
              isFinal: false,
            });
          }
          syncAggregate();
        },
        onFinalText: (text) => {
          if (!aggregateRef.current) return;
          const messages = aggregateRef.current.messages;
          const last = messages[messages.length - 1];
          if (last && last.role === 'user' && !last.isFinal) {
            last.text = text;
            last.isFinal = true;
          } else {
            aggregateRef.current.appendMessage({
              id: `user-speech-${Date.now()}`,
              role: 'user',
              text,
              timestamp: Date.now(),
              isFinal: true,
            });
          }
          syncAggregate();
        },
      });
      speechRecognizerRef.current = speechRecognizer;
      speechRecognizer.start(selectedPreset.id === 'english_tutor' ? 'en-US' : 'ja-JP');

      // 3. Setup WebSocket connection (supports local server and static GitHub Pages)
      const wsUrl = resolveLiveWebSocketUrl({ customServerUrl: backendServerUrl });
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'start_session',
            config: {
              model: 'gemini-3.8-live',
              voiceName,
              systemInstruction: customPrompt,
            },
          })
        );
        startVolumeMeterLoop();
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const parsed = ServerMessageSchema.safeParse(raw);
          if (!parsed.success) {
            console.warn('[ClientWs] Unrecognized server message:', raw);
            return;
          }

          const msg = parsed.data;
          switch (msg.type) {
            case 'session_started':
              setSessionState(SessionState.CONNECTED);
              break;

            case 'audio_chunk':
              setSessionState(SessionState.SPEAKING);
              audioManagerRef.current?.playAudioChunk(msg.audio);
              break;

            case 'transcript': {
              if (!aggregateRef.current) break;

              if (msg.role === 'user') {
                // User transcription from Gemini or input
                const messages = aggregateRef.current.messages;
                const last = messages[messages.length - 1];
                if (last && last.role === 'user' && !last.isFinal) {
                  last.text = msg.text;
                  last.isFinal = msg.isFinal;
                } else {
                  aggregateRef.current.appendMessage({
                    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    role: 'user',
                    text: msg.text,
                    timestamp: msg.timestamp || Date.now(),
                    isFinal: msg.isFinal,
                  });
                }
              } else if (msg.role === 'model') {
                // Streaming Gemini response
                aggregateRef.current.appendOrUpdateStreamingModelMessage(msg.text, msg.isFinal);
              }

              syncAggregate();
              break;
            }

            case 'interrupted':
              audioManagerRef.current?.stopAudioPlayback();
              if (aggregateRef.current) {
                aggregateRef.current.finalizeLastModelMessage();
                syncAggregate();
              }
              setSessionState(SessionState.INTERRUPTED);
              break;

            case 'status':
              if (msg.status === SessionState.CONNECTED && aggregateRef.current) {
                aggregateRef.current.finalizeLastModelMessage();
                syncAggregate();
              }
              setSessionState(msg.status);
              break;

            case 'error':
              setErrorMessage(`Gemini Liveエラー [${msg.code}]: ${msg.message}`);
              if (msg.code === 'CONNECTION_FAILED' || msg.code === 'GEMINI_LIVE_ERROR') {
                endSession();
              }
              break;
          }
        } catch (err: any) {
          console.error('[ClientWs] Message parsing error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[ClientWs] WebSocket error:', err);
        setErrorMessage('WebSocket接続に失敗しました。サーバーの状態をご確認ください。');
        endSession();
      };

      ws.onclose = () => {
        console.log('[ClientWs] WebSocket connection closed');
        endSession();
      };
    } catch (err: any) {
      console.error('[useLiveVoiceSession] Start failed:', err);
      setErrorMessage(`セッション開始に失敗しました: ${err.message}`);
      endSession();
    }
  }, [
    voiceName,
    selectedPreset,
    customPrompt,
    currentSessionId,
    endSession,
    startVolumeMeterLoop,
    syncAggregate,
  ]);

  // Send typed message
  const sendTextMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const trimmed = text.trim();

      if (aggregateRef.current) {
        aggregateRef.current.appendMessage({
          id: `user-text-${Date.now()}`,
          role: 'user',
          text: trimmed,
          timestamp: Date.now(),
          isFinal: true,
        });
        syncAggregate();
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'text_input',
            text: trimmed,
          })
        );
      }
    },
    [syncAggregate]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  return {
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
    messages: currentSession?.messages || [],
    // Session operations
    createNewSession,
    selectSession,
    deleteSession,
    renameSession,
    exportSessionMarkdown,
    clearCurrentSessionMessages,
    // Controls & Settings
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
    getInputAnalyser: () => audioManagerRef.current?.getInputAnalyser() ?? null,
    getOutputAnalyser: () => audioManagerRef.current?.getOutputAnalyser() ?? null,
  };
}
