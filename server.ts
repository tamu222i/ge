import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ProtocolHandler } from './src/domain/protocol-handler.ts';
import { SessionState } from './src/schemas/session.ts';

const app = express();
const server = http.createServer(app);
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// API Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    geminiKeySet: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Setup Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Setup WebSocket Server for Live Voice Streaming
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/ws/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (clientWs: WebSocket) => {
  console.log('[WebSocket] Client connected for Live Voice session');
  let geminiSession: any = null;

  const sendMessageToClient = (msgJson: string) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(msgJson);
    }
  };

  const handler = new ProtocolHandler({
    onAudioInput: (base64Audio: string) => {
      if (geminiSession) {
        try {
          geminiSession.sendRealtimeInput({
            audio: {
              data: base64Audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } catch (err: any) {
          console.error('[Gemini Live] Error sending realtime input:', err);
        }
      }
    },
    onTextInput: (text: string) => {
      if (geminiSession) {
        try {
          geminiSession.sendRealtimeInput({
            text,
          });
        } catch (err: any) {
          console.error('[Gemini Live] Error sending text input:', err);
        }
      }
    },
    onInterrupt: () => {
      // Interruption triggered by client
      console.log('[Gemini Live] Client requested interruption');
    },
    onEndSession: () => {
      cleanupGeminiSession();
    },
  });

  const cleanupGeminiSession = () => {
    if (geminiSession) {
      try {
        if (typeof geminiSession.close === 'function') {
          geminiSession.close();
        }
      } catch (err) {
        console.warn('[Gemini Live] Error closing session:', err);
      }
      geminiSession = null;
    }
  };

  clientWs.on('message', async (data) => {
    const raw = data.toString();
    try {
      const parsed = JSON.parse(raw);

      // If client requests starting a new session, establish connection to Gemini Live
      if (parsed.type === 'start_session') {
        cleanupGeminiSession();

        const voiceName = parsed.config?.voiceName || 'Zephyr';
        const systemInstruction =
          parsed.config?.systemInstruction ||
          'You are Gemini Live, an empathetic, conversational, and direct voice companion. Respond naturally and keep answers relatively brief for smooth audio turn-taking.';

        try {
          console.log(`[Gemini Live] Connecting to model gemini-3.8-live with voice: ${voiceName}`);

          geminiSession = await ai.live.connect({
            model: 'gemini-3.8-live',
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
              systemInstruction,
            },
            callbacks: {
              onmessage: (liveMsg: LiveServerMessage) => {
                // Check for user input transcription from model
                const inputTx =
                  liveMsg.serverContent?.inputTranscription ||
                  liveMsg.serverContent?.interimInputTranscription;
                if (inputTx?.text) {
                  handler.sendServerMessage(sendMessageToClient, {
                    type: 'transcript',
                    role: 'user',
                    text: inputTx.text,
                    isFinal: Boolean(inputTx.finished || liveMsg.serverContent?.inputTranscription),
                    timestamp: Date.now(),
                  });
                }

                // Check for audio output
                const parts = liveMsg.serverContent?.modelTurn?.parts;
                if (parts && parts.length > 0) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      handler.sendServerMessage(sendMessageToClient, {
                        type: 'audio_chunk',
                        audio: part.inlineData.data,
                      });
                    }
                    if (part.text) {
                      handler.sendServerMessage(sendMessageToClient, {
                        type: 'transcript',
                        role: 'model',
                        text: part.text,
                        isFinal: false,
                        timestamp: Date.now(),
                      });
                    }
                  }
                }

                // Check for output transcription if present
                const outputTx = liveMsg.serverContent?.outputTranscription;
                if (outputTx?.text) {
                  handler.sendServerMessage(sendMessageToClient, {
                    type: 'transcript',
                    role: 'model',
                    text: outputTx.text,
                    isFinal: Boolean(outputTx.finished),
                    timestamp: Date.now(),
                  });
                }

                // Check for model turn completion
                if (liveMsg.serverContent?.turnComplete) {
                  handler.sendServerMessage(sendMessageToClient, {
                    type: 'status',
                    status: SessionState.CONNECTED,
                  });
                }

                // Check for interruption
                if (liveMsg.serverContent?.interrupted) {
                  console.log('[Gemini Live] Model was interrupted');
                  handler.sendServerMessage(sendMessageToClient, {
                    type: 'interrupted',
                  });
                }
              },
              onerror: (err: any) => {
                console.error('[Gemini Live] Session error:', err);
                handler.sendError(
                  sendMessageToClient,
                  'GEMINI_LIVE_ERROR',
                  err?.message || 'Error occurred during Gemini Live session'
                );
              },
              onclose: () => {
                console.log('[Gemini Live] Session closed');
                handler.sendServerMessage(sendMessageToClient, {
                  type: 'status',
                  status: SessionState.IDLE,
                });
              },
            },
          });

          // Session established, process start_session message through handler
          handler.handleClientMessage(raw, sendMessageToClient);
        } catch (error: any) {
          console.error('[Gemini Live] Connection failed:', error);
          handler.sendError(
            sendMessageToClient,
            'CONNECTION_FAILED',
            error?.message || 'Failed to establish Gemini Live connection. Check GEMINI_API_KEY.'
          );
        }
        return;
      }

      // Delegate all other messages to protocol handler
      handler.handleClientMessage(raw, sendMessageToClient);
    } catch (e: any) {
      handler.sendError(sendMessageToClient, 'UNEXPECTED_ERROR', e?.message || 'Unexpected server error');
    }
  });

  clientWs.on('close', () => {
    console.log('[WebSocket] Client disconnected');
    cleanupGeminiSession();
  });

  clientWs.on('error', (err) => {
    console.error('[WebSocket] Client error:', err);
    cleanupGeminiSession();
  });
});

// Mount Vite or serve static assets in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Server] Gemini Live Voice Companion listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start:', err);
});
