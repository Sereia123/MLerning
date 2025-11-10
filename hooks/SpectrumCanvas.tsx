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
    const analyser = analyserRef.current;
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    analyser.fftSize = 2048;
    analyser.minDecibels = -100;
    analyser.maxDecibels = -30;
    analyser.smoothingTimeConstant = 0.85;

    // 周波数データを扱うため、frequencyBinCountを使用します
    const bufferLength = analyser.frequencyBinCount;
    // getFloatFrequencyDataはFloat32Arrayを必要とします
    const dataArray = new Float32Array(bufferLength);

    const sampleRate = analyser.context.sampleRate;
    const nyquist = sampleRate / 2;

    const spectrumHeight = height - 20; // 波形描画領域の高さ
    const labelHeight = 20; // ラベル描画領域の高さ

    let animationFrameId: number;

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);

      // 毎フレーム、背景とラベルを再描画する
      canvasCtx.fillStyle = 'rgb(17 24 39)'; // bg-gray-900
      canvasCtx.fillRect(0, 0, width, height);

      // 周波数ラベルの描画
      canvasCtx.fillStyle = 'rgb(156 163 175)'; // text-gray-400
      canvasCtx.font = '12px sans-serif';
      const labels = [100, 1000, 10000];
      labels.forEach(freq => {
        const x = (Math.log10(freq) / Math.log10(nyquist)) * width;
        canvasCtx.fillText(`${freq < 1000 ? freq : (freq / 1000) + 'k'}Hz`, x + 4, spectrumHeight + labelHeight - 4);
        canvasCtx.fillRect(x, spectrumHeight, 1, labelHeight);
      });

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(34 197 94)'; // green-500
      canvasCtx.beginPath();

      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];

        // -100dB (minDecibels) を 0、-30dB (maxDecibels) を 1 に正規化
        const normalizedValue = (value - analyser.minDecibels) / (analyser.maxDecibels - analyser.minDecibels);
        // Y座標の計算基準を波形描画領域の高さにする
        const y = (1 - normalizedValue) * spectrumHeight;

        // i番目のデータに対応する周波数を計算
        const freq = (i * nyquist) / bufferLength;

        // 周波数を対数スケールでX座標にマッピング
        // 低周波数を表示から除外 (e.g., 20Hz以下)
        if (freq < 20) continue;
        const x = (Math.log10(freq) / Math.log10(nyquist)) * width;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
      }

      canvasCtx.stroke();

      // 周波数データを取得して次のフレームに備える
      analyser.getFloatFrequencyData(dataArray);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyserRef, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}