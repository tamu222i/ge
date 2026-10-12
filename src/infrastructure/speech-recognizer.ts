/**
 * Optional browser-side Web Speech API helper
 * Provides local real-time interim speech transcription alongside Gemini Live
 */

export interface SpeechRecognizerCallbacks {
  onInterimText: (text: string) => void;
  onFinalText: (text: string) => void;
  onError?: (err: any) => void;
}

export class BrowserSpeechRecognizer {
  private recognition: any = null;
  private isRunning = false;
  private callbacks: SpeechRecognizerCallbacks;

  constructor(callbacks: SpeechRecognizerCallbacks) {
    this.callbacks = callbacks;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'ja-JP';

        this.recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript.trim()) {
            this.callbacks.onFinalText(finalTranscript.trim());
          } else if (interimTranscript.trim()) {
            this.callbacks.onInterimText(interimTranscript.trim());
          }
        };

        this.recognition.onerror = (e: any) => {
          if (e.error !== 'no-speech' && e.error !== 'aborted') {
            this.callbacks.onError?.(e);
          }
        };

        this.recognition.onend = () => {
          if (this.isRunning) {
            try {
              this.recognition.start();
            } catch {
              // Ignore restart error
            }
          }
        };
      } catch (err) {
        console.warn('[BrowserSpeechRecognizer] SpeechRecognition not initialized:', err);
      }
    }
  }

  public isSupported(): boolean {
    return Boolean(this.recognition);
  }

  public start(lang = 'ja-JP'): void {
    if (!this.recognition || this.isRunning) return;
    try {
      this.recognition.lang = lang;
      this.isRunning = true;
      this.recognition.start();
    } catch {
      // Ignore if already running
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop error
      }
    }
  }
}
