'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContextConst, loadWorkletModule } from '@/lib/audio';
import midiToFreq from './midiToFreq';

export default function useSyntheWorklet() {
  //AudioContextはスタジオ
  const contextRef = useRef<AudioContext | null>(null);
  //AudioWorkletNodeは楽器
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  //エンベロープ用のアンプ
  const ampRef = useRef<GainNode | null>(null);
  // 初期化済みフラグ
  const isInitializedRef = useRef(false);

  // AudioContext は自動で作らず、ユーザー操作時に初回生成する。
  // これはブラウザの自動再生制限（ユーザー操作前の AudioContext resume 禁止）を回避するため。

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
    // 初回呼び出し時に AudioContext と GainNode を作成する（ユーザー操作内で呼ぶことで許可される）
    if (!isInitializedRef.current) {
      const AudioContextClass = getAudioContextConst();
      const ac = new AudioContextClass();
      const amp = new GainNode(ac, { gain: 0 });
      amp.connect(ac.destination);
      contextRef.current = ac;
      ampRef.current = amp;
      isInitializedRef.current = true;
    }

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

    // ユーザー操作内で呼ばれていれば resume は許可される
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

  // ノートオン（サスティン開始、リリースは noteOff で行う）
  const noteOn = useCallback(async (midi: number) => {
    await ensureReady();
    const ac = contextRef.current;
    const amp = ampRef.current;
    const node = nodeRef.current;
    if (!ac || !amp || !node) return;

    const f = midiToFreq(midi);
    try {
      node.parameters.get('frequency')?.setValueAtTime(f, ac.currentTime);
    } catch {}

    const now = ac.currentTime;
    const A = 0.005; // Attack 5ms
    const current = typeof amp.gain.value === 'number' ? amp.gain.value : 0;
    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(current, now);
    amp.gain.linearRampToValueAtTime(1, now + A);

    if (ac.state === 'suspended') {
      try { await ac.resume(); } catch {}
    }
  }, [ensureReady]);

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

  // ミディ番号で短い音を鳴らす（クリック等の短いトリガ用）
  const playMidi = useCallback(async (midi: number) => {
    // noteOn して、duration 後に自動で noteOff する
    await noteOn(midi);
    const ac = contextRef.current;
    if (!ac) return;
    // duration は秒なので ms に変換
    setTimeout(() => {
      try { noteOff(); } catch {}
    }, Math.max(0, duration * 1000));
  }, [noteOn, noteOff, duration]);

  return { running, start, stop, freq, setFreq, gain, setGain, wave, setWave, pulseWidth, setPulseWidth, duration, setDuration, noteOn, noteOff, playMidi };
  }