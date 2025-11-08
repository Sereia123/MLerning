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
  const [gain, setGain] = useState(0.7); // 初期ボリュームを少し下げる
  const [wave, setWave] = useState(1);
  const [pulseWidth, setPulseWidth] = useState(0.5);
  const [duration, setDuration] = useState(0.5);
  const [mode, setMode] = useState<'poly' | 'mono'>('poly');
  // --- フィルター用の状態を追加 ---
  const [filterType, setFilterType] = useState<BiquadFilterType | 'off'>('off');
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

    const now = ac.currentTime;
    const rampTime = 0.02;

    // --- 新ロジック: 先に残りのボイスのゲインを上げる ---
    const newTargetGain = voicesRef.current.size - 1 > 0 ? 1.0 / (voicesRef.current.size - 1) : 1.0;
    voicesRef.current.forEach((v, m) => {
      if (m !== midi) { // これから消すボイス以外を対象
        v.amp.gain.cancelScheduledValues(now);
        v.amp.gain.setValueAtTime(v.amp.gain.value, now);
        v.amp.gain.linearRampToValueAtTime(newTargetGain, now + rampTime);
      }
    });

    const { node: workletNode, amp } = voice;
    const R = 0.05; // Release time
    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(amp.gain.value, now);
    amp.gain.linearRampToValueAtTime(0, now + R);
    
    return new Promise((resolve) => {
      const dummySource = ac.createBufferSource();
      dummySource.onended = () => {
        workletNode.disconnect();
        amp.disconnect();
        voicesRef.current.delete(midi);
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
    const masterAmp = masterAmpRef.current;
    if (masterAmp) {
      masterAmp.gain.setValueAtTime(gain, masterAmp.context.currentTime);
    }
    voicesRef.current.forEach((voice) => {
      voice.node.parameters.get('wave')?.setValueAtTime(wave, voice.node.context.currentTime);
      voice.node.parameters.get('pulseWidth')?.setValueAtTime(pulseWidth, voice.node.context.currentTime);
    });
  }, [gain, wave, pulseWidth]);

  // フィルターのパラメータが変更されたらAudioNodeに反映
  useEffect(() => {
    const ac = contextRef.current;
    const filterNode = filterNodeRef.current;
    const masterAmp = masterAmpRef.current;
    if (!ac || !filterNode || !masterAmp) return;

    if (filterType === 'off') {
      // フィルターがオフの場合、すべてのボイスをフィルターから切断し、マスターゲインに直接接続する
      voicesRef.current.forEach(voice => {
        voice.amp.disconnect();
        voice.amp.connect(masterAmp);
      });
    } else {
      // フィルターがオンの場合、パラメータを設定し、すべてのボイスをフィルターに接続する
      filterNode.type = filterType;
      filterNode.frequency.setValueAtTime(filterFreq, ac.currentTime);
      filterNode.Q.setValueAtTime(filterQ, ac.currentTime);

      voicesRef.current.forEach(voice => {
        voice.amp.disconnect();
        voice.amp.connect(filterNode);
      });
    }
  }, [filterType, filterFreq, filterQ]);

  // アンマウント時に停止
  useEffect(() => () => {
    stop();
  }, [stop]);

  // ノートオン（サスティン開始、リリースは noteOff で行う）
  const noteOn = useCallback(async (midi: number) => {
    await ensureReady();
    const ac = contextRef.current;
    const filterNode = filterNodeRef.current;
    const masterAmp = masterAmpRef.current;
    if (!ac || !filterNode || !masterAmp) return;

    const targetNode = filterType === 'off' ? masterAmp : filterNode;

    // --- Mono Mode Logic ---
    if (mode === 'mono') {
      // 既に鳴っているボイスがあれば、それを再利用する
      const currentMidi = Array.from(voicesRef.current.keys())[0];
      const currentVoice = voicesRef.current.get(currentMidi);
      if (currentVoice) {
        // 既存ボイスの周波数を変更して再トリガー
        const f = midiToFreq(midi);
        // --- レガート処理: ゲインは変更せず、周波数のみを更新 ---
        currentVoice.node.parameters.get('frequency')?.setValueAtTime(f, ac.currentTime);
        // 新しいMIDIノートでボイスを再登録
        voicesRef.current.delete(currentMidi);
        voicesRef.current.set(midi, currentVoice);
        return; // Polyモードのロジックは実行しない
      }
    }

    // 同じMIDIノートが既に鳴っていたら、一度止めてから鳴らし直す（リトリガー）
    const now = ac.currentTime;
    const existingVoice = voicesRef.current.get(midi);
    const rampTime = 0.02;
    if (existingVoice) {
      // 既存ボイスがあれば、周波数を変更してアタックを再トリガーする
      const f = midiToFreq(midi);
      existingVoice.node.parameters.get('frequency')?.setValueAtTime(f, now);
      existingVoice.amp.gain.cancelScheduledValues(now);
      existingVoice.amp.gain.setValueAtTime(0, now); // 一瞬0にしてから立ち上げる
      existingVoice.amp.gain.setTargetAtTime(1, now, 0.02 / 4); // 指数関数的な立ち上がりに変更
      return; // 新しいボイスは作らずに終了
    }

    // --- 新ロジック: マスターゲインは固定し、各ボイスのゲインを調整 ---
    const voiceCount = voicesRef.current.size + 1;
    const newTargetGain = 1.0 / voiceCount;

    // --- 新ロジック: 先に既存ボイスのゲインを下げる ---
    voicesRef.current.forEach(voice => {
      voice.amp.gain.cancelScheduledValues(now);
      voice.amp.gain.setValueAtTime(voice.amp.gain.value, now);
      voice.amp.gain.linearRampToValueAtTime(newTargetGain, now + rampTime);
    });

    const f = midiToFreq(midi);

    // 新しいボイスを作成
    const amp = new GainNode(ac, { gain: 0 });
    amp.connect(targetNode); // フィルターがオンならフィルターへ、オフならマスターゲインへ接続
    const node = new AudioWorkletNode(ac, 'processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      parameterData: { frequency: f, wave: wave, pulseWidth: pulseWidth }, // gainを削除
    });
    node.connect(amp);

    // --- クリックノイズ対策の最終手段 ---
    // parameterDataの適用が遅れるケースを想定し、生成直後にパラメータを明示的に再設定する
    node.parameters.get('frequency')?.setValueAtTime(f, now);
    node.parameters.get('wave')?.setValueAtTime(wave, now);
    node.parameters.get('pulseWidth')?.setValueAtTime(pulseWidth, now);

    voicesRef.current.set(midi, { node, amp });

    const A = 0.02; // Attack time
    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(newTargetGain, now + A);

    if (ac.state === 'suspended') {
      try { await ac.resume(); } catch {}
    }
  }, [ensureReady, wave, pulseWidth, mode, filterType]); // gainを依存配列から削除


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