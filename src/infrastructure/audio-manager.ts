import {
  float32ToPcm16Base64,
  base64ToFloat32Array,
  downsampleBuffer,
} from '../utils/pcm-audio.ts';

export interface AudioManagerCallbacks {
  onAudioChunk: (base64Audio: string) => void;
  onInputVolumeChange?: (volume: number) => void;
  onOutputVolumeChange?: (volume: number) => void;
  onError?: (error: Error) => void;
}

export class AudioManager {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;

  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private nextPlayTime: number = 0;
  private isMuted: boolean = false;
  private isRecording: boolean = false;
  private callbacks: AudioManagerCallbacks;

  constructor(callbacks: AudioManagerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Initializes both input (mic) and output (speaker) audio contexts
   */
  public async startRecording(): Promise<void> {
    if (this.isRecording) return;

    try {
      // 1. Get microphone stream with echo cancellation & noise suppression
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      // 2. Setup Input AudioContext
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtxClass();
      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }

      // Setup Input Analyser for User Waveform Visualizer
      this.inputAnalyser = this.inputAudioCtx.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      this.inputAnalyser.smoothingTimeConstant = 0.8;

      this.inputSource = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
      this.inputSource.connect(this.inputAnalyser);

      // Setup ScriptProcessor for PCM chunking (buffer size 2048 or 4096)
      const bufferSize = 4096;
      this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(bufferSize, 1, 1);

      this.scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.isRecording || this.isMuted) return;

        const inputChannelData = event.inputBuffer.getChannelData(0);
        const sourceRate = this.inputAudioCtx?.sampleRate || 48000;

        // Downsample to 16,000 Hz for Gemini Live
        const targetRate = 16000;
        const downsampled = downsampleBuffer(inputChannelData, sourceRate, targetRate);

        // Convert to PCM 16-bit Little Endian Base64
        const base64Audio = float32ToPcm16Base64(downsampled);
        this.callbacks.onAudioChunk(base64Audio);
      };

      this.inputAnalyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.inputAudioCtx.destination);

      // 3. Setup Output AudioContext at 24,000 Hz for Gemini Live speech playback
      this.ensureOutputContext();

      this.isRecording = true;
    } catch (err: any) {
      console.error('[AudioManager] Failed to initialize microphone:', err);
      this.callbacks.onError?.(err);
      throw err;
    }
  }

  private ensureOutputContext(): void {
    if (!this.outputAudioCtx || this.outputAudioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.smoothingTimeConstant = 0.8;
      this.outputAnalyser.connect(this.outputAudioCtx.destination);
      this.nextPlayTime = 0;
    }
  }

  /**
   * Enqueues and seamlessly plays a 24kHz PCM audio chunk received from Gemini
   */
  public async playAudioChunk(base64Audio: string): Promise<void> {
    try {
      this.ensureOutputContext();
      if (!this.outputAudioCtx) return;

      if (this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }

      const float32Samples = base64ToFloat32Array(base64Audio);
      if (float32Samples.length === 0) return;

      const audioBuffer = this.outputAudioCtx.createBuffer(
        1,
        float32Samples.length,
        24000 // Gemini Live sample rate
      );
      audioBuffer.getChannelData(0).set(float32Samples);

      const sourceNode = this.outputAudioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;

      if (this.outputAnalyser) {
        sourceNode.connect(this.outputAnalyser);
      } else {
        sourceNode.connect(this.outputAudioCtx.destination);
      }

      // Schedule seamless audio playback
      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + 0.03; // small 30ms jitter buffer
      }

      sourceNode.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;

      this.activeSources.add(sourceNode);
      sourceNode.onended = () => {
        this.activeSources.delete(sourceNode);
      };
    } catch (err: any) {
      console.warn('[AudioManager] Error playing audio chunk:', err);
    }
  }

  /**
   * Immediately stops and flushes all pending audio when interrupted by user
   */
  public stopAudioPlayback(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignore if already stopped
      }
    }
    this.activeSources.clear();
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getInputAnalyser(): AnalyserNode | null {
    return this.inputAnalyser;
  }

  public getOutputAnalyser(): AnalyserNode | null {
    return this.outputAnalyser;
  }

  public stop(): void {
    this.isRecording = false;
    this.stopAudioPlayback();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }

    if (this.inputAudioCtx && this.inputAudioCtx.state !== 'closed') {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx && this.outputAudioCtx.state !== 'closed') {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }
  }
}
