import { describe, it, expect } from 'vitest';
import {
  float32ToPcm16Base64,
  base64ToFloat32Array,
  calculateRmsLevel,
  downsampleBuffer,
} from '../pcm-audio.ts';

describe('BDD: PCM Audio Utilities', () => {
  describe('Given Float32 Web Audio PCM input', () => {
    it('When float32 samples are normalized between -1.0 and 1.0, Then converts to base64 16-bit PCM little-endian', () => {
      // 3 samples: 0, 1.0, -1.0
      const float32Samples = new Float32Array([0, 1.0, -1.0]);
      const base64 = float32ToPcm16Base64(float32Samples);

      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);

      // Decode back and check fidelity
      const decodedFloat32 = base64ToFloat32Array(base64);
      expect(decodedFloat32.length).toBe(3);
      expect(decodedFloat32[0]).toBeCloseTo(0, 2);
      expect(decodedFloat32[1]).toBeCloseTo(1.0, 2);
      expect(decodedFloat32[2]).toBeCloseTo(-1.0, 2);
    });

    it('When samples exceed [-1.0, 1.0], Then clamps properly without integer overflow wrap-around', () => {
      const overdrivenSamples = new Float32Array([1.5, -2.0]);
      const base64 = float32ToPcm16Base64(overdrivenSamples);
      const decoded = base64ToFloat32Array(base64);

      expect(decoded[0]).toBeCloseTo(1.0, 2);
      expect(decoded[1]).toBeCloseTo(-1.0, 2);
    });

    it('When calculating RMS level for silence and loud signals, Then returns accurate amplitude from 0.0 to 1.0', () => {
      const silence = new Float32Array([0, 0, 0, 0]);
      expect(calculateRmsLevel(silence)).toBe(0);

      const tone = new Float32Array([0.5, -0.5, 0.5, -0.5]);
      const rms = calculateRmsLevel(tone);
      expect(rms).toBeCloseTo(0.5, 2);
    });

    it('When input sample rate is 48000Hz and target is 16000Hz, Then accurately downsamples buffer', () => {
      // 6 samples downsampled to 2 samples (rate ratio 3:1)
      const input = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
      const downsampled = downsampleBuffer(input, 48000, 16000);

      expect(downsampled.length).toBe(2);
      expect(downsampled[0]).toBeCloseTo(0.1, 1);
    });
  });
});
