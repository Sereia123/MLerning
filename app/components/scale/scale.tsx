'use client';

import { useState, useEffect } from 'react';
import Keyboard from "./keyboard";
import useHandleClickNote from "@/logic/useHandleClickNote";
import KeyboardController from '@/logic/keyController';
import KeyMap from '@/logic/keyMap';
import { useSynthe } from '@/logic/SyntheProvider';
import SpectrumCanvas from '@/logic/SpectrumCanvas';
import WaveDisplay from '@/logic/WaveDisplay';

export default function Scale(){
  const [keyBoardNumber, setKeyBoardNumber] = useState(5); //盤面のモードチェンジ
  const { handleMouseDown, handleMouseUp } = useHandleClickNote();
  const { // useSyntheフックからstart関数も取得
    mode,
    setMode,
    filterType,
    setFilterType,
    filterFreq,
    setFilterFreq,
    filterQ,
    setFilterQ,
    gain,
    setGain,
    wave,
    setWave,
    attack,
    setAttack,
    decay,
    setDecay,
    sustain,
    setSustain,
    release,
    setRelease,
    start,
    analyserRef,
  } = useSynthe();

  useEffect(() => {
    start();
  }, [start]);

  const [pressedKeys, setPressedKeys] = useState<number[]>([]);
  const [isPanelVisible, setIsPanelVisible] = useState(false); // パネルの表示状態を管理

  // マウスイベントハンドラを生成

  const handleNoteDown = (midi: number) => {
    setPressedKeys((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
  };

  const handleNoteUp = (midi: number) => {
    setPressedKeys((prev) => prev.filter((n) => n !== midi));
  };

  // 対数スケール変換のための定数
  const minLogFreq = Math.log(20);
  const maxLogFreq = Math.log(20000);
  // スライダーの値 (0-100) を対数周波数に変換
  const handleLogSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseFloat(e.target.value);
    const scale = (maxLogFreq - minLogFreq) / 100;
    const newFreq = Math.exp(minLogFreq + scale * sliderValue);
    setFilterFreq(Math.round(newFreq));
  };
  // 現在の周波数をスライダーの値 (0-100) に変換
  const freqToSliderValue = () => {
    const scale = (maxLogFreq - minLogFreq) / 100;
    return (Math.log(filterFreq) - minLogFreq) / scale;
  };

  return (
    <>
      <div className="relative mx-auto w-[720px] p-4 grid grid-cols-3 gap-4 items-center text-white">
        <div>
          <label htmlFor="key-select" className="text-white mr-2">KeyScale:</label>
          <select
            id="key-select"
            value={keyBoardNumber}
            onChange={(e) => setKeyBoardNumber(Number(e.target.value))}
            className="bg-gray-700 text-white p-2 rounded"
          >
            {[...Array(7).keys()].map(i => (
              <option key={i} value={i}>
                Mode {i}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="mode-select" className="text-white mr-2">Mode:</label>
          <select
            id="mode-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'poly' | 'mono')}
            className="bg-gray-700 text-white p-2 rounded"
          >
            <option value="poly">Poly</option>
            <option value="mono">Mono</option>
          </select>
        </div>
        <div>
          <button 
            onClick={() => setIsPanelVisible(!isPanelVisible)}
            className="bg-gray-700 text-white p-2 rounded w-full"
          >
            {isPanelVisible ? 'Hide Panel' : 'Show Panel'}
          </button>
        </div>
        {/*追加画面（パネル）*/}
        {isPanelVisible && (
          <div className='absolute z-10 bg-blue-800/50 w-full mt-[500px] p-5 rounded-lg shadow-lg grid grid-cols-2 gap-4'>
            {/* --- フィルターコントロールUIの追加 --- */}
            <div className="col-span-1">
              <label htmlFor="wave-select" className="mr-2">Spectrum:</label>
              <select
                id="wave-select"
                value={wave}
                onChange={(e) => setWave(Number(e.target.value))}
                className="bg-gray-700 text-white p-2 rounded w-full"
              >
                <option value={0}>Sine</option>
                <option value={1}>Sawtooth</option>
                <option value={2}>Square</option>
                <option value={3}>Triangle</option>
                <option value={4}>Noise</option>
              </select>
            </div>
            <div className="col-span-1">
              <label htmlFor="gain-slider" className="mr-2">Volume: {gain.toFixed(2)}</label>
              <input
                type="range"
                id="gain-slider"
                min="0" max="1" step="0.01"
                value={gain}
                onChange={(e) => setGain(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="filter-type-select" className="mr-2">Filter Type:</label>
              <select
                id="filter-type-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as BiquadFilterType)}
                className="bg-gray-700 text-white p-2 rounded"
              >
              <option value="off">Off</option>
                <option value="lowpass">Lowpass</option>
                <option value="highpass">Highpass</option>
                <option value="bandpass">Bandpass</option>
                <option value="notch">Notch</option>
              </select>
            </div>
            <div className="col-span-2">
              <label htmlFor="frequency-slider" className="mr-2">
                Frequency: {filterFreq.toFixed(0)} Hz
              </label>
              <input
                type="range"
                id="frequency-slider"
                min="0"
                max="100"
                step="0.1"
                value={freqToSliderValue()}
                onChange={handleLogSliderChange}
                className="w-full"
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="q-slider" className="mr-2">Q: {filterQ}</label>
              <input
                type="range" id="q-slider" min="0.1" max="20" step="0.1"
                value={filterQ} onChange={(e) => setFilterQ(Number(e.target.value))} className="w-full"
              />
            </div>
            {/* --- ADSR Envelope Controls --- */}
            <div className="col-span-2 border-t border-blue-400 pt-4">
              <h4 className="text-lg font-semibold mb-2">Amp Envelope</h4>
            </div>
            <div className="col-span-1">
              <label htmlFor="attack-slider" className="mr-2">Attack: {attack.toFixed(2)}s</label>
              <input
                type="range" id="attack-slider" min="0.01" max="2" step="0.01"
                value={attack} onChange={(e) => setAttack(Number(e.target.value))} className="w-full"
              />
            </div>
            <div className="col-span-1">
              <label htmlFor="decay-slider" className="mr-2">Decay: {decay.toFixed(2)}s</label>
              <input
                type="range" id="decay-slider" min="0.01" max="2" step="0.01"
                value={decay} onChange={(e) => setDecay(Number(e.target.value))} className="w-full"
              />
            </div>
            <div className="col-span-1">
              <label htmlFor="sustain-slider" className="mr-2">Sustain: {sustain.toFixed(2)}</label>
              <input
                type="range" id="sustain-slider" min="0" max="1" step="0.01"
                value={sustain} onChange={(e) => setSustain(Number(e.target.value))} className="w-full"
              />
            </div>
            <div className="col-span-1">
              <label htmlFor="release-slider" className="mr-2">Release: {release.toFixed(2)}s</label>
              <input
                type="range" id="release-slider" min="0.01" max="2" step="0.01"
                value={release} onChange={(e) => setRelease(Number(e.target.value))} className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto w-[720px] flex flex-col items-center gap-4">
        <KeyboardController 
          keyMap={KeyMap(keyBoardNumber)}
          onNoteDown={handleNoteDown} 
          onNoteUp={handleNoteUp} 
        />
        <div className="h-[200px] w-full">
          <Keyboard 
            keyBoardNumber={keyBoardNumber}
            activeKeys={pressedKeys}
            onNoteDown={handleNoteDown}
            onNoteUp={handleNoteUp}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          />
        </div>
        <WaveDisplay analyserRef={analyserRef} width={720} height={120} />
        <SpectrumCanvas analyserRef={analyserRef} width={720} height={120} />
      </div>
    </>
  );
}            