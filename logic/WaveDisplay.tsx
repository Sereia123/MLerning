'use client';

import { useEffect, useRef } from 'react';

type WaveDisplayProps = {
  analyserRef: React.RefObject<AnalyserNode | null>;
  width: number;
  height: number;
};

export default function WaveDisplay({ analyserRef, width, height }: WaveDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let isRunning = true;

    const drawWave = () => {
      if (!isRunning) return;

      const analyser = analyserRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (!analyser || !canvas || !ctx) {
        animationFrameId = requestAnimationFrame(drawWave);
        return;
      }

      // デバイスピクセル比に対応
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0ff'; // Vueの例と同じ色
      ctx.beginPath();

      const sliceWidth = width * 1.0 / bufferLength;

      for (let i = 0; i < bufferLength; i++) {
        const x = i * sliceWidth;
        const v = dataArray[i] / 128.0; // 0-255 -> 0-2
        const y = v * (height / 2);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(drawWave);
    };

    drawWave();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyserRef, width, height]);

  return <canvas ref={canvasRef} />;
}