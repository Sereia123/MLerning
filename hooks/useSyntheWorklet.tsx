'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContextConst, loadWorkletModule } from '@/lib/audio';
import midiToFreq from '@/hooks/midiToFreq';

interface Voice {
  node: AudioWorkletNode;
  amp: GainNode;
}

export default function useSyntheWorklet() {
  //AudioContextはスタジオ
  const contextRef = useRef<AudioContext | null>(null);
  // マスターゲイン
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const masterAmpRef = useRef<GainNode | null>(null);
  // 鳴っているボイスを管理するMap。キーはMIDIノート番号
  const voicesRef = useRef<Map<number, Voice>>(new Map());
  // 初期化済みフラグ
  const isInitializedRef = useRef(false);

  const [running, setRunning] = useState(false);
  const [freq, setFreq] = useState(() => {
    const defaultNote = 60; 
    return Math.pow(2, (defaultNote - 69) / 12) * 440;
  });
  const [gain, setGain] = useState(1.0);
  const [wave, setWave] = useState(1);
  const [pulseWidth, setPulseWidth] = useState(0.5);
  const [duration, setDuration] = useState(0.5);
  const [mode, setMode] = useState<'poly' | 'mono'>('poly');
  // --- フィルター用の状態を追加 ---
  const [filterType, setFilterType] = useState<BiquadFilterType>('lowpass');
  const [filterFreq, setFilterFreq] = useState(1000);
  const [filterQ, setFilterQ] = useState(1);

  // こまごまとした設定
  const ensureReady = useCallback(async () => {
    // 初回呼び出し時に AudioContext と GainNode を作成する（ユーザー操作内で呼ぶことで許可される）
    if (!isInitializedRef.current) {
      const AudioContextClass = getAudioContextConst();
      const ac = new AudioContextClass({ latencyHint: 'interactive' });
      const filterNode = ac.createBiquadFilter();
      const masterAmp = new GainNode(ac, { gain: 1.0 });
      filterNode.connect(masterAmp);
      masterAmp.connect(ac.destination);
      filterNodeRef.current = filterNode;
      contextRef.current = ac;
      masterAmpRef.current = masterAmp;
      isInitializedRef.current = true;
      await loadWorkletModule(ac, '/worklets/processor.js');
      setRunning(true);
    }
  }, []);

  const noteOff = useCallback((midi: number): Promise<void> => {
    const ac = contextRef.current;
    const masterAmp = masterAmpRef.current;
    const voice = voicesRef.current.get(midi);
    if (!ac || !voice || !masterAmp) return Promise.resolve();

    const { node: workletNode, amp } = voice;
    const now = ac.currentTime;
    const R = 0.03; // Release
    const current = typeof amp.gain.value === 'number' ? amp.gain.value : 0;
    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(current, now); // setValueAtTimeは現在の値をセットするために必要
    amp.gain.linearRampToValueAtTime(0, now + R);
    
    return new Promise((resolve) => {
      // リリースエンベロープの終了に合わせてノードを破棄する
      const dummySource = ac.createBufferSource();
      dummySource.onended = () => {
        workletNode.disconnect();
        amp.disconnect();
        voicesRef.current.delete(midi);
        // 音が消えた後にマスターゲインを更新
        const newMasterGain = voicesRef.current.size > 0 ? 1.0 / voicesRef.current.size : 1.0;
        masterAmp.gain.setTargetAtTime(newMasterGain, ac.currentTime, 0.01);
        resolve();
      };
      dummySource.start(now + R);
      dummySource.stop(now + R);
    });
  }, []);

  // スタートボタン
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

    // 状態をリセット
    voicesRef.current.clear();
    masterAmpRef.current = null;
    contextRef.current = null;
    setRunning(false);
    isInitializedRef.current = false;

  }, [noteOff]);

  //UIで操作を行ったパラメータの更新
  useEffect(() => {
    const ac = contextRef.current;
    if (!ac) return;
    voicesRef.current.forEach((voice) => {
      const setP = (name: string, v: number) => voice.node.parameters.get(name)?.setValueAtTime(v, ac.currentTime);
      setP('gain', gain);
      setP('wave', wave);
      setP('pulseWidth', pulseWidth);
    });
  }, [freq, gain, wave, pulseWidth]);

  // フィルターのパラメータが変更されたらAudioNodeに反映
  useEffect(() => {
    const filterNode = filterNodeRef.current;
    const ac = contextRef.current;
    if (!filterNode || !ac) return;

    filterNode.type = filterType;
    // setValueAtTimeを使用して即時変更
    filterNode.frequency.setValueAtTime(filterFreq, ac.currentTime);
    filterNode.Q.setValueAtTime(filterQ, ac.currentTime);
  }, [filterType, filterFreq, filterQ]);

  // アンマウント時に停止
  useEffect(() => () => {
    stop();
  }, [stop]);

  // ノートオン（サスティン開始、リリースは noteOff で行う）
  const noteOn = useCallback(async (midi: number) => {
    await ensureReady();
    const ac = contextRef.current;
    const filterNode = filterNodeRef.current; // マスターゲインの代わりにフィルターノードを取得
    if (!ac || !filterNode) return;

    // --- Mono Mode Logic ---
    if (mode === 'mono') {
      // 既に鳴っているボイスがあれば、それを再利用する
      const currentMidi = Array.from(voicesRef.current.keys())[0];
      const currentVoice = voicesRef.current.get(currentMidi);
      if (currentVoice) {
        // 既存ボイスの周波数を変更して再トリガー
        const f = midiToFreq(midi);
        currentVoice.node.parameters.get('frequency')?.setValueAtTime(f, ac.currentTime);
        currentVoice.amp.gain.cancelScheduledValues(ac.currentTime);
        currentVoice.amp.gain.setValueAtTime(currentVoice.amp.gain.value, ac.currentTime);
        currentVoice.amp.gain.linearRampToValueAtTime(1, ac.currentTime + 0.01);
        // 新しいMIDIノートでボイスを再登録
        voicesRef.current.delete(currentMidi);
        voicesRef.current.set(midi, currentVoice);
        return; // Polyモードのロジックは実行しない
      }
    }

    // 同じMIDIノートが既に鳴っていたら、一度止めてから鳴らし直す（リトリガー）
    const now = ac.currentTime;
    const existingVoice = voicesRef.current.get(midi);
    if (existingVoice) {
      // 既存ボイスがあれば、周波数を変更してアタックを再トリガーする
      const f = midiToFreq(midi);
      existingVoice.node.parameters.get('frequency')?.setValueAtTime(f, now);
      existingVoice.amp.gain.cancelScheduledValues(now);
      existingVoice.amp.gain.setValueAtTime(existingVoice.amp.gain.value, now);
      existingVoice.amp.gain.linearRampToValueAtTime(1, now + 0.01);
      return; // 新しいボイスは作らずに終了
    }

    // マスターゲインを先に調整する
    const voiceCount = voicesRef.current.size + 1;
    const masterAmp = masterAmpRef.current;
    const newMasterGain = 1.0 / voiceCount;
    masterAmp?.gain.setTargetAtTime(newMasterGain, now, 0.01);

    const f = midiToFreq(midi);

    // 新しいボイスを作成
    const amp = new GainNode(ac, { gain: 0 });
    amp.connect(filterNode); // 各ボイスの出力をマスターゲインではなくフィルターに接続
    const node = new AudioWorkletNode(ac, 'processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      parameterData: { frequency: f, gain: gain, wave: wave, pulseWidth: pulseWidth },
    });
    node.connect(amp);

    voicesRef.current.set(midi, { node, amp });

    const A = 0.01; // Attack
    const current = typeof amp.gain.value === 'number' ? amp.gain.value : 0;
    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(current, now);
    amp.gain.linearRampToValueAtTime(1, now + A);

    if (ac.state === 'suspended') {
      try { await ac.resume(); } catch {}
    }
  }, [ensureReady, gain, wave, pulseWidth, mode]); // masterAmpRefはRefなので依存配列に不要


  // ミディ番号で短い音を鳴らす（クリック等の短いトリガ用）
  const playMidi = useCallback(async (midi: number) => {
    await noteOn(midi);
    setTimeout(() => {
      try { noteOff(midi); } catch {}
    }, Math.max(0, duration * 1000));
  }, [noteOn, noteOff, duration]);

  return { 
    running, 
    start, 
    stop, 
    freq, setFreq, 
    gain, setGain, 
    wave, setWave, 
    pulseWidth, setPulseWidth, 
    duration, setDuration, 
    noteOn, 
    noteOff, 
    playMidi, 
    mode, setMode,
    // --- フィルター用の状態とセッターをエクスポート ---
    filterType, setFilterType,
    filterFreq, setFilterFreq,
    filterQ, setFilterQ
  };
}