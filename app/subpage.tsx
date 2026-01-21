'use client';
import { useSynthe } from '@/logic/SyntheProvider';
import React from 'react';

export default function SubPage() {
  const {
    running,
    start,
    stop,
    mode,
    setMode,
    synthes,
    setSynthes,
    activeSyntheId,
    setActiveSyntheId,
    noteOn,
    noteOff
  } = useSynthe();

  const activeSynthe = synthes.find(s => s.id === activeSyntheId);

  type NestedSyntheGroup = 'osc' | 'filter' | 'adsr';
  type SyntheSettings = typeof synthes[0];

  // Helper to update deeply nested state immutably
  const handleNestedChange = <
    G extends NestedSyntheGroup,
    K extends keyof SyntheSettings[G]
  >(
    group: G,
    key: K,
    value: SyntheSettings[G][K]
  ) => {
    setSynthes(prevSynthes =>
      prevSynthes.map(synthe => {
        if (synthe.id === activeSyntheId) {
          // Use a switch statement for explicit, type-safe updates
          switch (group) {
            case 'osc':
              return { ...synthe, osc: { ...synthe.osc, [key]: value } };
            case 'filter':
              return { ...synthe, filter: { ...synthe.filter, [key]: value } };
            case 'adsr':
              return { ...synthe, adsr: { ...synthe.adsr, [key]: value } };
            default:
              return synthe;
          }
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


  if (!activeSynthe) {
    return <div>Loading synth...</div>;
  }

  const { osc, filter, adsr, on, mix } = activeSynthe;

  return (
    <>
      <div className="flex gap-3 mb-4">
        {!running
          ? <button onClick={start} className="rounded-xl px-4 py-2 bg-black text-white">▶ Start Audio</button>
          : <button onClick={stop} className="rounded-xl px-4 py-2 bg-gray-200">⏹ Stop Audio</button>}
      </div>

      <div className="space-y-4 text-white p-4 bg-gray-800 rounded-lg">
        {/* --- Global Settings --- */}
        <div className="flex gap-4 border-b border-gray-600 pb-4">
          <label>
            <input type="radio" name="mode" value="poly" checked={mode === 'poly'} onChange={() => setMode('poly')} />
            Poly
          </label>
          <label>
            <input type="radio" name="mode" value="mono" checked={mode === 'mono'} onChange={() => setMode('mono')} />
            Mono
          </label>
        </div>

        {/* --- Synth Tabs --- */}
        <div className="flex border-b border-gray-600">
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
        
        {/* --- Synth Panel --- */}
        <div className="p-4 bg-gray-700 rounded-b-md space-y-4">
          {/* On/Off Switch for Synthe 2 & 3 */}
          {activeSynthe.id > 1 && (
             <label className="flex items-center gap-2">
                <span className="font-bold text-lg">{on ? "ON" : "OFF"}</span>
                <input type="checkbox" checked={on} onChange={(e) => handleValueChange('on', e.target.checked)} className="w-6 h-6"/>
             </label>
          )}

          {/* --- Oscillator Section --- */}
          <div className="p-2 border border-gray-600 rounded">
            <h3 className="font-bold mb-2">Oscillator</h3>
            <label className="block">
              <span className="text-sm">Waveform</span>
              <select value={osc.wave} onChange={(e) => handleNestedChange('osc', 'wave', Number(e.target.value))} className="w-full border rounded p-2 bg-gray-800">
                <option value={1}>Sine</option>
                <option value={2}>Saw</option>
                <option value={3}>Square</option>
                <option value={4}>Pulse</option>
              </select>
            </label>
            {osc.wave === 4 && (
              <label className="block">
                <span className="text-sm">Pulse Width: {osc.pulseWidth.toFixed(2)}</span>
                <input type="range" min={0.01} max={0.99} step={0.01} value={osc.pulseWidth}
                  onChange={(e) => handleNestedChange('osc', 'pulseWidth', Number(e.target.value))} className="w-full" />
              </label>
            )}
            <label className="block">
              <span className="text-sm">Semi: {osc.semi}</span>
              <input type="range" min={-24} max={24} step={1} value={osc.semi}
                onChange={(e) => handleNestedChange('osc', 'semi', Number(e.target.value))} className="w-full" />
            </label>
             <label className="block">
              <span className="text-sm">Cent: {osc.cent}</span>
              <input type="range" min={-50} max={50} step={1} value={osc.cent}
                onChange={(e) => handleNestedChange('osc', 'cent', Number(e.target.value))} className="w-full" />
            </label>
          </div>

          {/* --- Filter Section --- */}
          <div className="p-2 border border-gray-600 rounded">
            <h3 className="font-bold mb-2">Filter</h3>
             <label className="block">
                <span className="text-sm">Type</span>
                <select value={filter.type} onChange={(e) => handleNestedChange('filter', 'type', e.target.value as BiquadFilterType | 'off')} className="w-full border rounded p-2 bg-gray-800">
                    <option value="off">Off</option>
                    <option value="lowpass">Lowpass</option>
                    <option value="highpass">Highpass</option>
                    <option value="bandpass">Bandpass</option>
                    <option value="notch">Notch</option>
                </select>
            </label>
            <label className="block">
              <span className="text-sm">Frequency: {filter.freq} Hz</span>
              <input type="range" min={20} max={20000} step={1} value={filter.freq}
                onChange={(e) => handleNestedChange('filter', 'freq', Number(e.target.value))} className="w-full" />
            </label>
            <label className="block">
              <span className="text-sm">Q: {filter.q.toFixed(2)}</span>
              <input type="range" min={0.1} max={20} step={0.1} value={filter.q}
                onChange={(e) => handleNestedChange('filter', 'q', Number(e.target.value))} className="w-full" />
            </label>
          </div>
          
          {/* --- ADSR Section --- */}
          <div className="p-2 border border-gray-600 rounded">
             <h3 className="font-bold mb-2">Envelope (ADSR)</h3>
             <label className="block"><span className="text-sm">Attack: {adsr.attack.toFixed(2)}s</span><input type="range" min={0.01} max={2} step={0.01} value={adsr.attack} onChange={(e) => handleNestedChange('adsr', 'attack', Number(e.target.value))} className="w-full" /></label>
             <label className="block"><span className="text-sm">Decay: {adsr.decay.toFixed(2)}s</span><input type="range" min={0.01} max={2} step={0.01} value={adsr.decay} onChange={(e) => handleNestedChange('adsr', 'decay', Number(e.target.value))} className="w-full" /></label>
             <label className="block"><span className="text-sm">Sustain: {adsr.sustain.toFixed(2)}</span><input type="range" min={0} max={1} step={0.01} value={adsr.sustain} onChange={(e) => handleNestedChange('adsr', 'sustain', Number(e.target.value))} className="w-full" /></label>
             <label className="block"><span className="text-sm">Release: {adsr.release.toFixed(2)}s</span><input type="range" min={0.01} max={4} step={0.01} value={adsr.release} onChange={(e) => handleNestedChange('adsr', 'release', Number(e.target.value))} className="w-full" /></label>
          </div>

           {/* --- Mix Section --- */}
          <div className="p-2 border border-gray-600 rounded">
            <h3 className="font-bold mb-2">Mix</h3>
             <label className="block">
                <span className="text-sm">Level: {mix.toFixed(2)}</span>
                <input type="range" min={0} max={1} step={0.01} value={mix} onChange={(e) => handleValueChange('mix', Number(e.target.value))} className="w-full" />
             </label>
          </div>
        </div>

        {/* --- Test Buttons --- */}
        <div className="flex gap-2 pt-4">
            <button onMouseDown={() => noteOn(60)} onMouseUp={() => noteOff(60)} className="p-2 bg-gray-600 rounded">Test C4</button>
            <button onMouseDown={() => noteOn(64)} onMouseUp={() => noteOff(64)} className="p-2 bg-gray-600 rounded">Test E4</button>
            <button onMouseDown={() => noteOn(67)} onMouseUp={() => noteOff(67)} className="p-2 bg-gray-600 rounded">Test G4</button>
        </div>
      </div>
    </>
  );
}