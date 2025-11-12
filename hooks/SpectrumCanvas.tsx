'use client';

import { useEffect, useRef } from 'react';

type SpectrumCanvasProps = {
  analyserRef: React.RefObject<AnalyserNode | null>;
  width: number;
  height: number;
};

export default function SpectrumCanvas({ analyserRef, width, height }: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let rafId = 0;
    let drawId = 0;
    let running = true;

    const tryStart = () => {
      if (!running) return;
      const analyser = analyserRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!analyser || !canvas || !ctx) {
        // まだanalyserが来ていない: 次フレームでもう一度チェック
        rafId = requestAnimationFrame(tryStart);
        return;
      }

      // ★ デバイスピクセル比に対応（にじみ防止）
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      analyser.fftSize = 2048;
      analyser.minDecibels = -80; // この値を大きくすると、より小さい音が描画されなくなる
      analyser.maxDecibels = -30;
      analyser.smoothingTimeConstant = 0.85;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      const sampleRate = analyser.context.sampleRate;
      const nyquist = sampleRate / 2;

      const spectrumHeight = height - 20;
      const labelHeight = 20;

      const draw = () => {
        if (!running) return;
        drawId = requestAnimationFrame(draw);

        // ★ 先にデータを取得してから描画
        analyser.getFloatFrequencyData(dataArray);

        ctx.fillStyle = 'rgb(17 24 39)';
        ctx.fillRect(0, 0, width, height);

        // --- ラベルと目盛りの描画 ---
        ctx.fillStyle = 'rgb(156 163 175)';
        ctx.font = '11px sans-serif';

        // 表示したい周波数のリスト
        const freqsToShow = [50, 100, 500, 1000, 5000, 10000];

        freqsToShow.forEach((freq) => {
          const x = (Math.log10(freq) / Math.log10(nyquist)) * width;
          const label = freq < 1000 ? freq.toString() : `${freq / 1000}k`;
          ctx.fillText(label, x + 2, spectrumHeight + labelHeight - 4);
          ctx.fillRect(x, spectrumHeight, 1, labelHeight);
        });

        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgb(34 197 94)';
        ctx.beginPath();

        let started = false;
        for (let i = 0; i < bufferLength; i++) {
          const value = dataArray[i]; // dB（負の値）
          const normalized = (value - analyser.minDecibels) / (analyser.maxDecibels - analyser.minDecibels);
          const y = (1 - Math.min(Math.max(normalized, 0), 1)) * spectrumHeight;

          const freq = (i * nyquist) / bufferLength;
          if (freq < 20) continue; // 20Hz未満は捨てる

          const x = (Math.log10(freq) / Math.log10(nyquist)) * width;

          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      };

      draw();
    };

    tryStart();

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (drawId) cancelAnimationFrame(drawId);
    };
  }, [analyserRef, width, height]);

  return <canvas ref={canvasRef} />;
}
