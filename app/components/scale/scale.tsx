'use client';

import { useState } from 'react';
import Keyboard from "./keyboard";
import useHandleClickNote from "@/hooks/useHandleClickNote";
import KeyboardController from '@/hooks/keyController';
import KeyMap from '@/hooks/keyMap';
import { useSynthe } from '@/hooks/SyntheProvider';

export default function ScaleBase(){
  const [keyBoardNumber, setKeyBoardNumber] = useState(5); //盤面のモードチェンジ
  const { handleMouseDown, handleMouseUp } = useHandleClickNote();
  const {
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
  } = useSynthe();

  const [pressedKeys, setPressedKeys] = useState<number[]>([]);
  const [isPanelVisible, setIsPanelVisible] = useState(true); // パネルの表示状態を管理

  // マウスイベントハンドラを生成

  const handleNoteDown = (midi: number) => {
    setPressedKeys((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
  };

  const handleNoteUp = (midi: number) => {
    setPressedKeys((prev) => prev.filter((n) => n !== midi));
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
          <div className='absolute z-10 bg-blue-800/50 w-full h-[400px] mt-[450px] p-5 rounded-lg shadow-lg grid grid-cols-2 gap-4'>
            {/* --- フィルターコントロールUIの追加 --- */}
            <div className="col-span-1">
              <label htmlFor="wave-select" className="mr-2">Waveform:</label>
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
                Frequency: {filterFreq} Hz
              </label>
              <input
                type="range"
                id="frequency-slider"
                min="20"
                max="10000"
                step="1"
                value={filterFreq}
                onChange={(e) => setFilterFreq(Number(e.target.value))}
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
          </div>
        )}
      </div>

      

      <div className="mx-auto flex items-center h-[300px] w-[720px]">
        <KeyboardController 
          keyMap={KeyMap(keyBoardNumber)}
          onNoteDown={handleNoteDown} 
          onNoteUp={handleNoteUp} 
        />
        <Keyboard 
          keyBoardNumber={keyBoardNumber}
          activeKeys={pressedKeys}
          onNoteDown={handleNoteDown}
          onNoteUp={handleNoteUp}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        />
      </div>
    </>
  );
}            