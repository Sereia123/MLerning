'use client';

import { useState, useEffect } from 'react';
import Keyboard from "./keyboard";
import useHandleClickNote from "@/logic/useHandleClickNote";
import KeyboardController from '@/logic/keyController';
import KeyMap from '@/logic/keyMap';
import { useSynthe } from '@/logic/SyntheProvider';
import SpectrumCanvas from '@/logic/SpectrumCanvas';
import WaveDisplay from '@/logic/WaveDisplay';
import { SyntheSettings } from '@/logic/useSyntheWorklet';

type NestedSyntheGroup = 'osc' | 'filter' | 'adsr';

export default function Scale(){
  const [keyBoardNumber, setKeyBoardNumber] = useState(5); //盤面のモードチェンジ
  const { handleMouseDown, handleMouseUp } = useHandleClickNote();
  const { 
    mode,
    setMode,
    start,
    analyserRef,
    synthes,
    setSynthes,
    activeSyntheId,
    setActiveSyntheId,
  } = useSynthe();

  const activeSynthe = synthes.find(s => s.id === activeSyntheId);

  useEffect(() => {
    start();
  }, [start]);

  const [pressedKeys, setPressedKeys] = useState<number[]>([]);
  const [isPanelVisible, setIsPanelVisible] = useState(false); // パネルの表示状態を管理

  // Helper to update deeply nested state immutably
  const handleNestedChange = <G extends NestedSyntheGroup, K extends keyof SyntheSettings[G]>(
    group: G,
    key: K,
    value: SyntheSettings[G][K]
  ) => {
    setSynthes(prevSynthes =>
      prevSynthes.map(synthe => {
        if (synthe.id === activeSyntheId) {
          return {
            ...synthe,
            [group]: {
              ...synthe[group],
              [key]: value,
            },
          };
        }
        return synthe;
      })
    );
  };

  const handleValueChange = <K extends keyof SyntheSettings>(
    key: K,
    value: SyntheSettings[K]
  ) => {
    setSynthes(prevSynthes =>
      prevSynthes.map(synthe =>
        synthe.id === activeSyntheId ? { ...synthe, [key]: value } : synthe
      )
    );
  };

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
    handleNestedChange('filter', 'freq', Math.round(newFreq));
  };
  // 現在の周波数をスライダーの値 (0-100) に変換
  const freqToSliderValue = () => {
    if (!activeSynthe) return 0;
    const scale = (maxLogFreq - minLogFreq) / 100;
    return (Math.log(activeSynthe.filter.freq) - minLogFreq) / scale;
  };

  if (!activeSynthe) {
    return <div>Loading...</div>;
  }

  const { osc, filter, adsr, on, mix } = activeSynthe;

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
          <div className='absolute z-10 bg-blue-800/50 w-full mt-[500px] p-5 rounded-lg shadow-lg'>
             {/* --- Synth Tabs --- */}
            <div className="flex border-b border-gray-400 mb-4">
              {synthes.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSyntheId(s.id)}
                  className={`px-4 py-2 ${activeSyntheId === s.id ? 'bg-blue-600 text-white' : 'bg-gray-700'} rounded-t-md`}
                >
                  Synthe {s.id}
                </button>
              ))}
            </div>

            {/* On/Off Switch for Synthe 2 & 3 */}
            {activeSynthe.id > 1 && (
              <label className="flex items-center gap-2 mb-4">
                  <span className="font-bold text-lg">{on ? "ON" : "OFF"}</span>
                  <input type="checkbox" checked={on} onChange={(e) => handleValueChange('on', e.target.checked)} className="w-6 h-6"/>
              </label>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* --- Oscillator, Mix --- */}
              <div className="col-span-1 space-y-2">
                <h4 className="text-lg font-semibold">Oscillator</h4>
                <label htmlFor="wave-select" className="mr-2">Waveform:</label>
                <select
                  id="wave-select"
                  value={osc.wave}
                  onChange={(e) => handleNestedChange('osc', 'wave', Number(e.target.value))}
                  className="bg-gray-700 text-white p-2 rounded w-full"
                >
                  <option value={1}>Sine</option>
                  <option value={2}>Saw</option>
                  <option value={3}>Triangle</option>
                  <option value={4}>Square</option>
                  <option value={5}>Pulse</option>
                </select>

                {osc.wave === 5 && (
                  <div>
                    <label htmlFor="pulsewidth-slider" className="mr-2">Pulse Width: {osc.pulseWidth.toFixed(2)}</label>
                    <input
                      type="range" id="pulsewidth-slider" min="0.01" max="0.99" step="0.01"
                      value={osc.pulseWidth} onChange={(e) => handleNestedChange('osc', 'pulseWidth', Number(e.target.value))} className="w-full"
                    />
                  </div>
                )}

                {activeSynthe.id > 1 && (
                  <div>
                    <label htmlFor="octave-control" className="mr-2">Octave: {osc.octave > 0 ? '+' : ''}{osc.octave}</label>
                    <div id="octave-control" className="flex items-center gap-2">
                      <button 
                        onClick={() => handleNestedChange('osc', 'octave', Math.max(-2, osc.octave - 1))}
                        className="bg-gray-600 px-3 py-1 rounded"
                      >-</button>
                      <input
                        type="range" min="-2" max="2" step="1"
                        value={osc.octave} onChange={(e) => handleNestedChange('osc', 'octave', Number(e.target.value))} className="w-full"
                      />
                      <button 
                        onClick={() => handleNestedChange('osc', 'octave', Math.min(2, osc.octave + 1))}
                        className="bg-gray-600 px-3 py-1 rounded"
                      >+</button>
                    </div>
                  </div>
                )}

                <label htmlFor="gain-slider" className="mr-2">Volume: {mix.toFixed(2)}</label>
                <input
                  type="range" id="gain-slider" min="0" max="1" step="0.01"
                  value={mix} onChange={(e) => handleValueChange('mix', Number(e.target.value))} className="w-full"
                />
              </div>

              {/* --- Filter --- */}
              <div className="col-span-1 space-y-2">
                <h4 className="text-lg font-semibold">Filter</h4>
                <select
                  id="filter-type-select"
                  value={filter.type}
                  onChange={(e) => handleNestedChange('filter', 'type', e.target.value as BiquadFilterType | 'off')}
                  className="bg-gray-700 text-white p-2 rounded w-full"
                >
                  <option value="off">Off</option>
                  <option value="lowpass">Lowpass</option>
                  <option value="highpass">Highpass</option>
                  <option value="bandpass">Bandpass</option>
                  <option value="notch">Notch</option>
                </select>
                <div>
                  <label htmlFor="frequency-slider" className="mr-2">
                    Frequency: {filter.freq.toFixed(0)} Hz
                  </label>
                  <input
                    type="range" id="frequency-slider" min="0" max="100" step="0.1"
                    value={freqToSliderValue()} onChange={handleLogSliderChange} className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="q-slider" className="mr-2">Q: {filter.q.toFixed(2)}</label>
                  <input
                    type="range" id="q-slider" min="0.1" max="20" step="0.1"
                    value={filter.q} onChange={(e) => handleNestedChange('filter', 'q', Number(e.target.value))} className="w-full"
                  />
                </div>
              </div>
              
              {/* --- ADSR Envelope Controls --- */}
              <div className="col-span-2 border-t border-blue-400 pt-4 mt-2">
                <h4 className="text-lg font-semibold mb-2">Amp Envelope</h4>
              </div>
              <div className="col-span-1">
                <label className="text-sm">Attack: {adsr.attack.toFixed(2)}s</label>
                <input
                  type="range" min="0.01" max="2" step="0.01"
                  value={adsr.attack} onChange={(e) => handleNestedChange('adsr', 'attack', Number(e.target.value))} className="w-full"
                />
              </div>
              <div className="col-span-1">
                <label className="text-sm">Decay: {adsr.decay.toFixed(2)}s</label>
                <input
                  type="range" min="0.01" max="2" step="0.01"
                  value={adsr.decay} onChange={(e) => handleNestedChange('adsr', 'decay', Number(e.target.value))} className="w-full"
                />
              </div>
              <div className="col-span-1">
                <label className="text-sm">Sustain: {adsr.sustain.toFixed(2)}</label>
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={adsr.sustain} onChange={(e) => handleNestedChange('adsr', 'sustain', Number(e.target.value))} className="w-full"
                />
              </div>
              <div className="col-span-1">
                <label className="text-sm">Release: {adsr.release.toFixed(2)}s</label>
                <input
                  type="range" min="0.01" max="2" step="0.01"
                  value={adsr.release} onChange={(e) => handleNestedChange('adsr', 'release', Number(e.target.value))} className="w-full"
                />
              </div>
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