/**
 * PCM Audio Processing Utilities for Gemini Live Real-time API
 * Input: 16kHz Mono 16-bit PCM (Little-Endian)
 * Output: 24kHz Mono 16-bit PCM (Little-Endian)
 */

/**
 * Converts Float32Array audio samples (-1.0 to 1.0) into 16-bit PCM Little Endian base64 string
 */
export function float32ToPcm16Base64(float32Array: Float32Array): string {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to [-1.0, 1.0]
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    // Scale to 16-bit signed integer
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // Convert Int16Array bytes to base64
  const uint8 = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(uint8).toString('base64');
  }

  // Browser fallback using binary string
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

/**
 * Decodes base64 16-bit PCM Little Endian string to Float32Array (-1.0 to 1.0)
 */
export function base64ToFloat32Array(base64: string): Float32Array {
  let uint8: Uint8Array;

  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  } else {
    const binary = atob(base64);
    uint8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8[i] = binary.charCodeAt(i);
    }
  }

  // Read Int16Array in Little Endian
  const dataView = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);
  const sampleCount = Math.floor(uint8.byteLength / 2);
  const float32 = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const int16 = dataView.getInt16(i * 2, true); // true for little endian
    float32[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
  }

  return float32;
}

/**
 * Calculates Root Mean Square (RMS) volume level normalized between 0.0 and 1.0
 */
export function calculateRmsLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }

  const rms = Math.sqrt(sumSquares / samples.length);
  // Cap between 0 and 1
  return Math.min(1, Math.max(0, rms));
}

/**
 * Resamples an audio buffer from a source sample rate (e.g. 48kHz / 44.1kHz) to target sample rate (e.g. 16kHz)
 */
export function downsampleBuffer(
  buffer: Float32Array,
  sourceRate: number,
  targetRate: number
): Float32Array {
  if (sourceRate === targetRate || sourceRate <= 0 || targetRate <= 0) {
    return buffer;
  }

  const ratio = sourceRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const origIndex = i * ratio;
    const floorIndex = Math.floor(origIndex);
    const ceilIndex = Math.min(buffer.length - 1, floorIndex + 1);
    const t = origIndex - floorIndex;

    // Linear interpolation
    result[i] = (1 - t) * buffer[floorIndex] + t * buffer[ceilIndex];
  }

  return result;
}
