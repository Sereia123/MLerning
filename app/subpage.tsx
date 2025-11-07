'use client';
import { useSynthe } from '@/hooks/SyntheProvider';

export default function SubPage(){
  const { running, start, stop, freq, setFreq, gain, setGain, wave, setWave, pulseWidth, setPulseWidth, noteOn, noteOff, duration, setDuration, mode, setMode } = useSynthe();

  return (
    <>
      <div className="flex gap-3">
        {!running
          ? <button onClick={start} className="rounded-xl px-4 py-2 bg-black text-white">▶ 再生開始</button>
          : <button onClick={stop}  className="rounded-xl px-4 py-2 bg-gray-200">⏹ 停止</button>}
      </div>

      <div className="space-y-4 text-white">
        <div className="flex gap-4">
          <label>
            <input type="radio" name="mode" value="poly" checked={mode === 'poly'} onChange={() => setMode('poly')} />
            Poly
          </label>
          <label>
            <input type="radio" name="mode" value="mono" checked={mode === 'mono'} onChange={() => setMode('mono')} />
            Mono
          </label>
        </div>

        <label className="block">
          <span className="text-sm">Waveform</span>
          <select value={wave} onChange={(e) => setWave(Number(e.target.value))} className="w-full border rounded p-2">
            <option value={0}>Sine</option>
            <option value={1}>Square</option>
            <option value={2}>Saw</option>
            <option value={3}>Triangle</option>
            <option value={4}>Noise</option>
          </select>
        </label>

        {wave === 1 && (
          <label className="block">
            <span className="text-sm">Pulse Width: {pulseWidth.toFixed(2)}</span>
            <input type="range" min={0.01} max={0.99} step={0.01} value={pulseWidth}
              onChange={(e) => setPulseWidth(Number(e.target.value))} className="w-full" />
          </label>
        )}

        <label className="block">
          <span className="text-sm">Frequency: {freq} Hz</span>
          <input type="range" min={50} max={2000} step={1} value={freq}
            onChange={(e) => setFreq(Number(e.target.value))} className="w-full" />
        </label>

        <label className="block">
          <span className="text-sm">Gain: {gain.toFixed(2)}</span>
          <input type="range" min={0} max={1} step={0.01} value={gain}
            onChange={(e) => setGain(Number(e.target.value))} className="w-full" />
        </label>

        <button onMouseDown={() => noteOn(60)} onMouseUp={() => noteOff(60)}>C4</button>
      <button onMouseDown={() => noteOn(64)} onMouseUp={() => noteOff(64)}>E4</button>
      <button onClick={stop}>Stop All</button>

      <input type="range" min={0.05} max={2} step={0.01}
        value={duration} onChange={e => setDuration(Number(e.target.value))} />
      </div>
    </>
  );
}