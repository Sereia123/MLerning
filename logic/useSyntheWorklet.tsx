'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContextConst, loadWorkletModule } from '@/lib/audio';
import midiToFreq from '@/logic/midiToFreq';

// --- Types ---
export interface SyntheSettings {
  id: number;
  on: boolean;
  osc: {
    wave: number;
    pulseWidth: number;
    semi: number;
    cent: number;
    octave: number;
  };
  filter: {
    type: BiquadFilterType | 'off';
    freq: number;
    q: number;
  };
  adsr: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  mix: number;
}

interface Voice {
  syntheId: number;
  workletNode: AudioWorkletNode;
  filterNode: BiquadFilterNode;
  mixNode: GainNode;
  masterAmp: GainNode;
}

const initialSynthes: SyntheSettings[] = [
  {
    id: 1,
    on: true,
    osc: { wave: 1, pulseWidth: 0.5, semi: 0, cent: 0, octave: 0 },
    filter: { type: 'off', freq: 8000, q: 0.7 },
    adsr: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.05 },
    mix: 0.7,
  },
  {
    id: 2,
    on: false,
    osc: { wave: 2, pulseWidth: 0.5, semi: 12, cent: 0, octave: 0 },
    filter: { type: 'off', freq: 8000, q: 1 },
    adsr: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.05 },
    mix: 0.5,
  },
  {
    id: 3,
    on: false,
    osc: { wave: 4, pulseWidth: 0.5, semi: -12, cent: 0, octave: 0 },
    filter: { type: 'off', freq: 8000, q: 1 },
    adsr: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.05 },
    mix: 0.5,
  },
];


export default function useSyntheWorklet() {
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const voicesRef = useRef<Map<number, Voice[]>>(new Map());
  const isInitializedRef = useRef(false);
  const workletLoadedRef = useRef(false);

  // --- Global Synth State ---
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<'poly' | 'mono'>('poly');
  
  // --- Synthesizer States ---
  const [synthes, setSynthes] = useState<SyntheSettings[]>(initialSynthes);
  const [activeSyntheId, setActiveSyntheId] = useState<number>(1);

  const ensureReady = useCallback(async () => {
    if (!isInitializedRef.current) {
      const AudioContext = getAudioContextConst();
      if (!AudioContext) return;
      const ac = new AudioContext({ latencyHint: 'interactive' });
      const analyser = ac.createAnalyser();
      analyser.connect(ac.destination);

      contextRef.current = ac;
      analyserRef.current = analyser;
      isInitializedRef.current = true;
      
      await loadWorkletModule(ac, '/worklets/processor.js');
      workletLoadedRef.current = true;
      setRunning(true);
    }
  }, []);

  const noteOff = useCallback((midi: number): Promise<void[]> => {
    const ac = contextRef.current;
    const voices = voicesRef.current.get(midi);
    if (!ac || !voices) return Promise.resolve([]);

    const promises = voices.map(voice => {
      const { masterAmp, workletNode, filterNode, mixNode } = voice;
      const syntheConf = synthes.find(s => s.id === voice.syntheId);
      const release = syntheConf?.adsr.release || 0.05;
      const now = ac.currentTime;

      masterAmp.gain.cancelScheduledValues(now);
      masterAmp.gain.setValueAtTime(masterAmp.gain.value, now);
      masterAmp.gain.linearRampToValueAtTime(0, now + release);

      return new Promise<void>((resolve) => {
        const timer = ac.createBufferSource();
        timer.onended = () => {
          workletNode.disconnect();
          filterNode.disconnect();
          mixNode.disconnect();
          masterAmp.disconnect();
          resolve();
        };
        timer.start(now + release);
        timer.stop(now + release);
      });
    });
    
    voicesRef.current.delete(midi);
    return Promise.all(promises);
  }, [synthes]);
  
  const noteOn = useCallback(async (midi: number) => {
    await ensureReady();
    const ac = contextRef.current;
    const analyser = analyserRef.current;
    if (!ac || !analyser || !workletLoadedRef.current) return;

    if (mode === 'mono' && voicesRef.current.size > 0) {
      const firstVoiceKey = voicesRef.current.keys().next().value;
      if (firstVoiceKey !== undefined) {
        await noteOff(firstVoiceKey);
      }
    }
    
    if (voicesRef.current.has(midi)) {
      await noteOff(midi);
    }

    const now = ac.currentTime;
    const baseFreq = midiToFreq(midi);
    const activeVoices: Voice[] = [];

    synthes.forEach(synthe => {
      if (!synthe.on) return;

      const { osc, filter, adsr, mix, id } = synthe;
      
      const workletNode = new AudioWorkletNode(ac, 'processor', {
        numberOfOutputs: 1,
        outputChannelCount: [1],
        parameterData: {
          frequency1: baseFreq * Math.pow(2, ((osc.semi + osc.octave * 12) * 100 + osc.cent) / 1200),
          wave1: osc.wave,
          pulseWidth1: osc.pulseWidth,
        },
      });

      const filterNode = ac.createBiquadFilter();
      if (filter.type === 'off') {
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(ac.sampleRate / 2, now);
        filterNode.Q.setValueAtTime(1, now);
      } else {
        filterNode.type = filter.type;
        filterNode.frequency.setValueAtTime(filter.freq, now);
        filterNode.Q.setValueAtTime(filter.q, now);
      }

      const mixNode = new GainNode(ac, { gain: mix });
      const masterAmp = new GainNode(ac, { gain: 0 });

      // Connect audio graph
      workletNode.connect(filterNode);
      filterNode.connect(mixNode);
      mixNode.connect(masterAmp);
      masterAmp.connect(analyser);
      
      activeVoices.push({ syntheId: id, workletNode, filterNode, mixNode, masterAmp });

      // Apply master ADSR
      const peakGain = 0.7 / synthes.filter(s => s.on).length; // Adjust peak gain by number of active synths
      const sustainGain = peakGain * adsr.sustain;
      masterAmp.gain.cancelScheduledValues(now);
      masterAmp.gain.setValueAtTime(0, now);
      masterAmp.gain.linearRampToValueAtTime(peakGain, now + adsr.attack);
      masterAmp.gain.setTargetAtTime(sustainGain, now + adsr.attack, adsr.decay / 4);
    });

    if(activeVoices.length > 0) {
      voicesRef.current.set(midi, activeVoices);
    }

    if (ac.state === 'suspended') {
      try { await ac.resume(); } catch {}
    }
  }, [ensureReady, mode, synthes, noteOff]);

  const start = useCallback(async () => {
    await ensureReady();
    const ac = contextRef.current;
    if (ac && ac.state === 'suspended') {
      try { await ac.resume(); } catch {}
    }
  }, [ensureReady]);

  const stop = useCallback(async () => {
    const promises = Array.from(voicesRef.current.keys()).map(midi => noteOff(midi));
    await Promise.all(promises);
    contextRef.current?.close().catch(() => {});
    voicesRef.current.clear();
    contextRef.current = null;
    setRunning(false);
    isInitializedRef.current = false;
  }, [noteOff]);

  // Update live parameters
  useEffect(() => {
    const ac = contextRef.current;
    if (!ac) return;
    const now = ac.currentTime;

    voicesRef.current.forEach((voices, midi) => {
        const baseFreq = midiToFreq(midi);
        
        voices.forEach(voice => {
          const synthe = synthes.find(s => s.id === voice.syntheId);
          if (!synthe) return;

          const { workletNode, filterNode, mixNode } = voice;
          const { osc, filter, mix } = synthe;

          // Update worklet parameters
          workletNode.parameters.get('frequency1')?.setValueAtTime(baseFreq * Math.pow(2, ((osc.semi + osc.octave * 12) * 100 + osc.cent) / 1200), now);
          workletNode.parameters.get('wave1')?.setValueAtTime(osc.wave, now);
          workletNode.parameters.get('pulseWidth1')?.setValueAtTime(osc.pulseWidth, now);

          // Update filter and mix nodes
          if (filter.type === 'off') {
            if (filterNode.type !== 'lowpass') filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(ac.sampleRate / 2, now);
            filterNode.Q.setValueAtTime(1, now);
          } else {
            if (filterNode.type !== filter.type) filterNode.type = filter.type;
            filterNode.frequency.setValueAtTime(filter.freq, now);
            filterNode.Q.setValueAtTime(filter.q, now);
          }
          mixNode.gain.setValueAtTime(mix, now);
        });
    });
  }, [synthes]);
  
  useEffect(() => () => {
    stop();
  }, [stop]);

  return { 
    running, 
    start, 
    stop, 
    noteOn, 
    noteOff, 
    mode, setMode,
    synthes, setSynthes,
    activeSyntheId, setActiveSyntheId,
    analyserRef,
  };
}