'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContextConst, loadWorkletModule } from '@/lib/audio';

export default function useSyntheWorklet() {
  //AudioContextはスタジオ
  const contextRef = useRef<AudioContext | null>(null);
  //AudioWorkletNodeは楽器
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  //エンベロープ用のアンプ
  const ampRef = useRef<GainNode | null>(null);
  // 初期化済みフラグ
  const isInitializedRef = useRef(false);

  // マウント時に AudioContext とエンベロープを事前初期化(レイテンシを下げる)
  useEffect(() => {
    async function initAudio() {
      if (isInitializedRef.current) return;
      const AudioContextClass = getAudioContextConst();
      const ac = new AudioContextClass();
      const amp = new GainNode(ac, { gain: 0 });
      amp.connect(ac.destination);
      // 先に resume 
      if (ac.state === 'suspended') {
        try {
          await ac.resume();
        } catch {}
      }
      contextRef.current = ac;
      ampRef.current = amp;
      isInitializedRef.current = true;
    }
    initAudio();
    return () => {
      contextRef.current?.close();
      contextRef.current = null;
      ampRef.current = null;
      isInitializedRef.current = false;
    };
  }, []);

  const [running, setRunning] = useState(false);
  const [freq, setFreq] = useState(() => {
    const defaultNote = 60; 
    return Math.pow(2, (defaultNote - 69) / 12) * 440;
  });
  const [gain, setGain] = useState(0.2);
  const [wave, setWave] = useState(0);
  const [pulseWidth, setPulseWidth] = useState(0.5);
  const [duration, setDuration] = useState(0.5);

  // こまごまとした設定
  const ensureReady = useCallback(async () => {
    if (!isInitializedRef.current) return; // 初期化待ち
    if (nodeRef.current) return; 

    const ac = contextRef.current!;
    await loadWorkletModule(ac, '/worklets/processor.js');
    const node = new AudioWorkletNode(ac, 'processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      parameterData: { frequency: freq, gain: gain, wave: wave, pulseWidth: pulseWidth },
    });

    node.connect(ampRef.current!);

    if (ac.state === 'suspended') {
      try {
        await ac.resume();
      } catch {}
    }
    nodeRef.current = node;
    setRunning(true);
  }, [freq, gain, wave, pulseWidth]);

  // スタートボタン
  const start = useCallback(async () => {
    await ensureReady();
  }, [ensureReady]);

  const stop = useCallback(() => {
    try {
      ampRef.current?.disconnect();
      nodeRef.current?.disconnect();
      contextRef.current?.close();
    } finally {
      ampRef.current = null;
      contextRef.current = null;
      nodeRef.current = null;
      setRunning(false);
    }
  }, []);

  //UIで操作を行ったパラメータの更新
  useEffect(() => {
    const node = nodeRef.current, ac = contextRef.current;
    if (!node || !ac ) return;
    const setP = (name: string, v: number) => node.parameters.get(name)?.setValueAtTime(v, ac.currentTime);
    setP('frequency', freq);   
    setP('gain',      gain);
    setP('wave',      wave);
    setP('pulseWidth', pulseWidth);
  }, [freq, gain, wave, pulseWidth]);

  // アンマウント時に停止
  useEffect(() => () => {
    try { 
      ampRef.current?.disconnect(); 
      nodeRef.current?.disconnect(); 
      contextRef.current?.close(); 
    } catch {}
    ampRef.current = null; 
    nodeRef.current = null; 
    contextRef.current = null; 
    setRunning(false);
  }, []);

  // ノートオン+デュレーションあり
  const trigger = useCallback(async () => {
    await ensureReady();
    if (!contextRef.current || !ampRef.current) return;
    const ac = contextRef.current;
    const amp = ampRef.current;
    const now = ac.currentTime;

    const A = 0.005; // Attack 5ms
    const R = 0.05;  // Release 50ms

    const current = typeof amp.gain.value === 'number' ? amp.gain.value : 0;
    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(current, now);
    amp.gain.linearRampToValueAtTime(1, now + A);
    amp.gain.setValueAtTime(1, now + A + duration);
    amp.gain.linearRampToValueAtTime(0, now + A + duration + R);

    if (ac.state === 'suspended') { 
      try 
      { 
        await ac.resume(); 
      } 
      catch {} 
    }
  }, [ensureReady, duration]);

  // ノートオフ
  const noteOff = useCallback(() => {
    const ac = contextRef.current, amp = ampRef.current;
    if (!ac || !amp) return;
    const now = ac.currentTime;
    const current = typeof amp.gain.value === 'number' ? amp.gain.value : 0;
    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(current, now);
    amp.gain.linearRampToValueAtTime(0, now + 0.03);
  }, []);

  return { running, start, stop, freq, setFreq, gain, setGain, wave, setWave, pulseWidth, setPulseWidth, duration, setDuration, trigger, noteOff};
  }
