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


  const initPromiseRef = useRef<Promise<boolean> | null>(null);





  // --- Global Synth State ---


  const [running, setRunning] = useState(false);


  const [mode, setMode] = useState<'poly' | 'mono'>('poly');


  


    // --- Synthesizer States ---


  


    const [synthes, setSynthes] = useState<SyntheSettings[]>(initialSynthes);


  


    const synthesRef = useRef(synthes);


  


    synthesRef.current = synthes;


  


    const prevSynthesRef = useRef<SyntheSettings[]>(initialSynthes);


  


    const [activeSyntheId, setActiveSyntheId] = useState<number>(1);


  


  


  


    // NOTE: These handlers are for the UI in scale.tsx to update the state.


  


    // The actual audio parameter updates are handled in the useEffect below.


  


    const handleNestedChange = useCallback(


  


      <G extends 'osc' | 'filter' | 'adsr', K extends keyof SyntheSettings[G]>(


  


        group: G,


  


        key: K,


  


        value: SyntheSettings[G][K]


  


      ) => {


  


        setSynthes(prevSynthes =>


  


          prevSynthes.map(synthe => {


  


            if (synthe.id === activeSyntheId) {


  


              const newGroup = { ...synthe[group], [key]: value };


  


              return { ...synthe, [group]: newGroup };


  


            }


  


            return synthe;


  


          })


  


        );


  


      },


  


      [activeSyntheId]


  


    );


  


  


  


    const handleValueChange = useCallback(


  


      <K extends keyof Omit<SyntheSettings, 'id' | 'osc' | 'filter' | 'adsr'>>(


  


        key: K,


  


        value: SyntheSettings[K]


  


      ) => {


  


        setSynthes(prevSynthes =>


  


          prevSynthes.map(synthe =>


  


            synthe.id === activeSyntheId ? { ...synthe, [key]: value } : synthe


  


          )


  


        );


  


      },


  


      [activeSyntheId]


  


    );


  


  


  


    const ensureReady = useCallback(async () => {


  


      if (initPromiseRef.current) {


  


        return initPromiseRef.current;


  


      }

    const promise = (async () => {
      const AudioContext = getAudioContextConst();
      if (!AudioContext) return false;

      let ac: AudioContext | null = null;
      try {
        ac = new AudioContext({ latencyHint: 'interactive' });
        
        // Wait for the module to be loaded *before* setting refs and state
        await loadWorkletModule(ac, '/worklets/processor.js');

        const analyser = ac.createAnalyser();
        analyser.connect(ac.destination);

        contextRef.current = ac;
        analyserRef.current = analyser;
        
        setRunning(true);
        return true;
      } catch (error) {
        console.error("Failed to initialize audio worklet:", error);
        if (ac) {
          ac.close().catch(e => console.error("Failed to close audio context on error:", e));
        }
        contextRef.current = null;
        setRunning(false);
        return false;
      }
    })();

    initPromiseRef.current = promise;
    return promise;
  }, []);





  const noteOff = useCallback((midi: number): Promise<void[]> => {
    const ac = contextRef.current;
    const voices = voicesRef.current.get(midi);
    if (!ac || !voices) return Promise.resolve([]);

    const promises = voices.map(voice => {
      const { masterAmp, workletNode, filterNode, mixNode } = voice;
      // Use ref to get the latest synthe settings without re-creating the function
      const syntheConf = synthesRef.current.find(s => s.id === voice.syntheId);
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
  }, []); // Remove synthes from dependencies

  const noteOn = useCallback(async (midi: number) => {
    const isReady = await ensureReady();
    if (!isReady) return;

    const ac = contextRef.current;
    const analyser = analyserRef.current;
    if (!ac || !analyser) return;

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

    // Use the latest state directly
    synthes.forEach(synthe => {
      if (!synthe.on) return;

      const { osc, filter, adsr, mix, id } = synthe;
      
      const workletNode = new AudioWorkletNode(ac, 'processor', {
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: {
          waveType: osc.wave,
        },
        parameterData: {
          frequency1: baseFreq * Math.pow(2, ((osc.semi + osc.octave * 12) * 100 + osc.cent) / 1200),
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
      const peakGain = 0.7 / synthes.filter(s => s.on).length;
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
    const isReady = await ensureReady();
    if (!isReady) return;
    
    const ac = contextRef.current;
    if (ac && ac.state === 'suspended') {
      try { await ac.resume(); } catch {}
    }
  }, [ensureReady]);

  const stop = useCallback(async () => {
    const promises = Array.from(voicesRef.current.keys()).map(midi => noteOff(midi));
    await Promise.all(promises);
    if (contextRef.current) {
      try {
        await contextRef.current.close();
      } catch (e) {
        console.error("Error closing AudioContext:", e);
      }
    }
    voicesRef.current.clear();
    contextRef.current = null;
    initPromiseRef.current = null; // Reset for re-initialization
    setRunning(false);
  }, [noteOff]);

  // Update live parameters efficiently
  useEffect(() => {
    const ac = contextRef.current;
    if (!ac || !running) return;
    const now = ac.currentTime;
    const rampTime = 0.02;

    const prevSynthes = prevSynthesRef.current;

    voicesRef.current.forEach((voices, midi) => {
      const baseFreq = midiToFreq(midi);

      voices.forEach(voice => {
        const currentSynthe = synthes.find(s => s.id === voice.syntheId);
        const prevSynthe = prevSynthes.find(s => s.id === voice.syntheId);

        if (!currentSynthe || !prevSynthe) return;

        const { workletNode, filterNode, mixNode } = voice;
        const { osc, filter, mix } = currentSynthe;
        const { osc: prevOsc, filter: prevFilter, mix: prevMix } = prevSynthe;

        // --- Update Worklet Parameters ---
        const targetFreq = baseFreq * Math.pow(2, ((osc.semi + osc.octave * 12) * 100 + osc.cent) / 1200);
        const prevTargetFreq = baseFreq * Math.pow(2, ((prevOsc.semi + prevOsc.octave * 12) * 100 + prevOsc.cent) / 1200);

        if (targetFreq !== prevTargetFreq) {
          workletNode.parameters.get('frequency1')?.setTargetAtTime(targetFreq, now, rampTime);
        }
        if (osc.wave !== prevOsc.wave) {
          workletNode.port.postMessage({ wave: osc.wave });
        }
        if (osc.pulseWidth !== prevOsc.pulseWidth) {
          workletNode.parameters.get('pulseWidth1')?.setTargetAtTime(osc.pulseWidth, now, rampTime);
        }

        // --- Update Filter Node ---
        if (filter.type !== prevFilter.type) {
            filterNode.type = filter.type === 'off' ? 'lowpass' : filter.type;
        }
        if (filter.type === 'off') {
            if (prevFilter.type !== 'off') {
                filterNode.frequency.setTargetAtTime(ac.sampleRate / 2, now, rampTime);
                filterNode.Q.setTargetAtTime(1, now, rampTime);
            }
        } else {
            if (filter.freq !== prevFilter.freq) {
                filterNode.frequency.setTargetAtTime(filter.freq, now, rampTime);
            }
            if (filter.q !== prevFilter.q) {
                filterNode.Q.setTargetAtTime(filter.q, now, rampTime);
            }
        }

        // --- Update Mix Node ---
        if (mix !== prevMix) {
          mixNode.gain.setTargetAtTime(mix, now, rampTime);
        }
      });
    });

    // Update ref for the next render
    prevSynthesRef.current = synthes;
  }, [synthes, running]);


  


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


        handleNestedChange,


        handleValueChange,


      };


    }

