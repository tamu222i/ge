import React, { useEffect, useRef } from 'react';
import { SessionState } from '../schemas/session.ts';

interface AudioVisualizerCanvasProps {
  userLevel: number;
  modelLevel: number;
  sessionState: SessionState;
  getInputAnalyser: () => AnalyserNode | null;
  getOutputAnalyser: () => AnalyserNode | null;
}

export const AudioVisualizerCanvas: React.FC<AudioVisualizerCanvasProps> = ({
  userLevel,
  modelLevel,
  sessionState,
  getInputAnalyser,
  getOutputAnalyser,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const inputData = new Uint8Array(64);
    const outputData = new Uint8Array(64);

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      phase += 0.04;

      const isConnected =
        sessionState !== SessionState.IDLE &&
        sessionState !== SessionState.CONNECTING &&
        sessionState !== SessionState.ERROR;

      const inputAnalyser = getInputAnalyser();
      const outputAnalyser = getOutputAnalyser();

      if (inputAnalyser) inputAnalyser.getByteFrequencyData(inputData);
      if (outputAnalyser) outputAnalyser.getByteFrequencyData(outputData);

      // Determine activity levels
      const isModelSpeaking = modelLevel > 0.02 || sessionState === SessionState.SPEAKING;
      const isUserSpeaking = userLevel > 0.02 || sessionState === SessionState.LISTENING;

      // Base radius of central interactive orb
      const baseRadius = Math.min(width, height) * 0.18;
      const dynamicRadius =
        baseRadius +
        (isModelSpeaking ? modelLevel * 50 : 0) +
        (isUserSpeaking ? userLevel * 40 : 0) +
        Math.sin(phase * 1.5) * 4;

      // Background ambient radial aura
      const auraGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.4,
        centerX,
        centerY,
        baseRadius * 2.5
      );

      if (isModelSpeaking) {
        auraGradient.addColorStop(0, 'rgba(147, 51, 234, 0.4)'); // purple
        auraGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.25)'); // blue
        auraGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
      } else if (isUserSpeaking) {
        auraGradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)'); // emerald
        auraGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.25)'); // cyan
        auraGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
      } else if (isConnected) {
        auraGradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)'); // indigo
        auraGradient.addColorStop(0.6, 'rgba(14, 165, 233, 0.1)');
        auraGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
      } else {
        auraGradient.addColorStop(0, 'rgba(71, 85, 105, 0.15)'); // slate idle
        auraGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
      }

      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Outer animated ripple rings
      const numRings = 3;
      for (let r = 0; r < numRings; r++) {
        const ringProgress = ((phase * 0.4 + r / numRings) % 1);
        const ringRadius = baseRadius + ringProgress * 90;
        const ringAlpha = Math.max(0, (1 - ringProgress) * (isConnected ? 0.35 : 0.1));

        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isModelSpeaking
          ? `rgba(168, 85, 247, ${ringAlpha})`
          : isUserSpeaking
          ? `rgba(52, 211, 153, ${ringAlpha})`
          : `rgba(129, 140, 248, ${ringAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Dynamic waveform perimeter
      const points = 64;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const freqIndex = i % 32;

        let offset = 0;
        if (isModelSpeaking) {
          const freqVal = (outputData[freqIndex] || 0) / 255;
          offset = Math.sin(angle * 6 + phase * 3) * (freqVal * 25 + 6);
        } else if (isUserSpeaking) {
          const freqVal = (inputData[freqIndex] || 0) / 255;
          offset = Math.sin(angle * 8 + phase * 2.5) * (freqVal * 20 + 5);
        } else if (isConnected) {
          offset = Math.sin(angle * 4 + phase) * 3;
        }

        const r = dynamicRadius + offset;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Core Orb Gradient
      const orbGradient = ctx.createLinearGradient(
        centerX - dynamicRadius,
        centerY - dynamicRadius,
        centerX + dynamicRadius,
        centerY + dynamicRadius
      );

      if (isModelSpeaking) {
        orbGradient.addColorStop(0, '#c084fc'); // purple-400
        orbGradient.addColorStop(0.5, '#6366f1'); // indigo-500
        orbGradient.addColorStop(1, '#06b6d4'); // cyan-500
      } else if (isUserSpeaking) {
        orbGradient.addColorStop(0, '#34d399'); // emerald-400
        orbGradient.addColorStop(0.5, '#10b981'); // emerald-500
        orbGradient.addColorStop(1, '#0284c7'); // sky-600
      } else if (isConnected) {
        orbGradient.addColorStop(0, '#818cf8');
        orbGradient.addColorStop(0.5, '#6366f1');
        orbGradient.addColorStop(1, '#3b82f6');
      } else {
        orbGradient.addColorStop(0, '#475569');
        orbGradient.addColorStop(1, '#1e293b');
      }

      ctx.fillStyle = orbGradient;
      ctx.shadowColor = isModelSpeaking
        ? 'rgba(168, 85, 247, 0.6)'
        : isUserSpeaking
        ? 'rgba(16, 185, 129, 0.6)'
        : 'rgba(99, 102, 241, 0.3)';
      ctx.shadowBlur = isConnected ? 24 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Status pulse indicator in center
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 13px system-ui, sans-serif';

      let statusText = '待機中';
      if (sessionState === SessionState.CONNECTING) statusText = '接続中...';
      else if (sessionState === SessionState.INTERRUPTED) statusText = '中断しました';
      else if (isModelSpeaking) statusText = 'Geminiが発話中';
      else if (isUserSpeaking) statusText = 'マイク入力中...';
      else if (isConnected) statusText = '聞いています';

      ctx.fillText(statusText, centerX, centerY);

      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [userLevel, modelLevel, sessionState, getInputAnalyser, getOutputAnalyser]);

  return (
    <div className="relative w-full aspect-square max-w-sm mx-auto flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full block rounded-3xl"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
