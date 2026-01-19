'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContextConst, loadWorkletModule } from '@/lib/audio';
import midiToFreq from '@/logic/midiToFreq';

interface Voice {
  node: AudioWorkletNode;
  amp: GainNode;
}

export default function useSyntheWorklet() {
  //AudioContextはスタジオ、AudioContextを格納する箱(+箱に入るものを指定)を作る、下も同様
  const contextRef = useRef<AudioContext | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const masterAmpRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // 鳴っているボイスを管理するMap。キーはMIDIノート番号
  const voicesRef = useRef<Map<number, Voice>>(new Map());
  // 上の箱において初期化済みかどうかを判断
  const isInitializedRef = useRef(false);

  const workletLoadedRef = useRef(false);

  const [running, setRunning] = useState(false);
  const [freq, setFreq] = useState(() => {
    const defaultNote = 60; 
    return Math.pow(2, (defaultNote - 69) / 12) * 440;
  });
  const [gain, setGain] = useState(0.7); 
  const [wave, setWave] = useState(1);
  const [pulseWidth, setPulseWidth] = useState(0.5);
  const [duration, setDuration] = useState(0.5);
  const [mode, setMode] = useState<'poly' | 'mono'>('poly');
  // フィルター用の状態を追加
  const [filterType, setFilterType] = useState<BiquadFilterType | 'off'>('off');
  const [filterFreq, setFilterFreq] = useState(1000);
  const [filterQ, setFilterQ] = useState(1);
  // ADSRエンベロープ用の状態を追加 
  const [attack, setAttack] = useState(0.02);
  const [decay, setDecay] = useState(0.1);
  const [sustain, setSustain] = useState(0.8);
  const [release, setRelease] = useState(0.05);

  // こまごまとした初期設定
  const ensureReady = useCallback(async () => {
    // 初回呼び出し時に AudioContext と GainNode を作成
    if (!isInitializedRef.current) {
      const AudioContext = getAudioContextConst();
      const ac = new AudioContext({ latencyHint: 'interactive' });
      const filterNode = ac.createBiquadFilter();
      const analyser = ac.createAnalyser();
      // const masterAmp = ac.createGain();
      // masterAmp.gain.value = 1.0;のあたらいい書き方
      const masterAmp = new GainNode(ac, { gain: 1.0 });

      //ノードを繋げる
      filterNode.connect(masterAmp);
      masterAmp.connect(analyser);
      analyser.connect(ac.destination);

      //箱に入れる
      filterNodeRef.current = filterNode;
      contextRef.current = ac;
      masterAmpRef.current = masterAmp;
      analyserRef.current = analyser;
      isInitializedRef.current = true;
      // AudioContextにデジタル信号処理をロード
      // awaitでloadされるまでまつ
      await loadWorkletModule(ac, '/worklets/processor.js');
      workletLoadedRef.current = true; //processorが入った処理
      setRunning(true);
    }
  }, []);

  //Promiseで非同期処理を実現
  const noteOff = useCallback((midi: number): Promise<void> => {
    const ac = contextRef.current;
    const masterAmp = masterAmpRef.current;
    // 一音一音のゲイン、マスターアンプに接続する前
    const voice = voicesRef.current.get(midi);
    // Promise.resolveで成功を返す
    if (!ac || !voice || !masterAmp) return Promise.resolve();

    const now = ac.currentTime;
    // 新しいボリュームにどれだけの時間で移行させるか
    const rampTime = 0.02;

    // 全体音の音量バランスを保つためのゲイン再調整処理
    // current.size = 今出ているボイスの数
    const newGain = voicesRef.current.size - 1 > 0 ? 1.0 / (voicesRef.current.size - 1) : 1.0;
    voicesRef.current.forEach((v, m) => { // v = value, m = key
      if (m !== midi) { // これから消すボイス以外を対象
        // ADSRの設定をクリア
        v.amp.gain.cancelScheduledValues(now);
        // 現在のゲイン値からプログラムを開始
        v.amp.gain.setValueAtTime(v.amp.gain.value, now);
        // rampTimeの時間で新しい音量に変更
        v.amp.gain.linearRampToValueAtTime(newGain, now + rampTime);
      }
    });

    // OFFにする音を徐々にフェードアウト
    // workletNode(音源), amp(音量)
    const { node: workletNode, amp } = voice;
    //ゲイン処理のクリア
    amp.gain.cancelScheduledValues(now);
    //今の音量からリリース開始
    amp.gain.setValueAtTime(amp.gain.value, now);
    // release値で滑らかに下げる
    amp.gain.linearRampToValueAtTime(0, now + release);

    return new Promise((resolve) => {
      // リリースが終わるタイマー
      const releaseTimer = ac.createBufferSource();
      // stop時間をonendedで検知、stopが設定されたら発火
      releaseTimer.onended = () => {
        workletNode.disconnect();
        amp.disconnect();
        voicesRef.current.delete(midi);
        resolve();
      };
      // startとstopを同タイミングにすることでその時間にonendedを発火
      releaseTimer.start(now + release);
      releaseTimer.stop(now + release);
    });
  }, [release]);

  // スタート
  const start = useCallback(async () => {
    await ensureReady();
    const ac = contextRef.current;
    // acの状態が停止なら再開
    if (ac && ac.state === 'suspended') {
      try { await ac.resume(); } catch {}
    }
  }, [ensureReady]);

  const stop = useCallback(async () => {
    const promises = Array.from(voicesRef.current.keys()).map(midi => noteOff(midi));
    await Promise.all(promises);

    //catchで失敗してもいいようにしておく
    contextRef.current?.close().catch(() => {});

    // 状態をリセット
    voicesRef.current.clear();
    masterAmpRef.current = null;
    contextRef.current = null;
    setRunning(false);
    isInitializedRef.current = false;

  }, [noteOff]);

  //UIで操作を行ったパラメータの更新(音量・波・短形波)
  useEffect(() => {
    const masterAmp = masterAmpRef.current;
    if (masterAmp) {
      // 現在の時刻に音量をセット
      masterAmp.gain.setValueAtTime(gain, masterAmp.context.currentTime);
    }
    voicesRef.current.forEach((voice) => {
      // 現在の時刻に波形と幅をセット
      voice.node.parameters.get('wave')?.setValueAtTime(wave, voice.node.context.currentTime);
      voice.node.parameters.get('pulseWidth')?.setValueAtTime(pulseWidth, voice.node.context.currentTime);
    });
  }, [gain, wave, pulseWidth]);

  // フィルターのパラメータが変更されたらAudioContextに反映
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
    const filterNode = filterNodeRef.current; // filterNode is used
    const masterAmp = masterAmpRef.current;
    if (!ac || !masterAmp || !filterNode || !workletLoadedRef.current) return;

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
    const newGain = 1.0 / voiceCount;

    // --- 新ロジック: 先に既存ボイスのゲインを下げる ---
    voicesRef.current.forEach(voice => {
      voice.amp.gain.cancelScheduledValues(now);
      voice.amp.gain.setValueAtTime(voice.amp.gain.value, now);
      voice.amp.gain.linearRampToValueAtTime(newGain, now + rampTime);
    });

    const f = midiToFreq(midi);

    // Workletがロードされていない場合はここで処理を中断
    if (!workletLoadedRef.current) return;

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

    // ADSRエンベロープを適用
    const peakGain = newGain;
    const sustainGain = peakGain * sustain;

    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(0, now);
    // Attack
    amp.gain.linearRampToValueAtTime(peakGain, now + attack);
    // Decay to Sustain
    amp.gain.setTargetAtTime(sustainGain, now + attack, decay / 4); // decayを時定数として使う

    if (ac.state === 'suspended') {
      try { await ac.resume(); } catch {}
    }
  }, [ensureReady, wave, pulseWidth, mode, filterType, attack, decay, sustain]); // gainを依存配列から削除


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
    filterQ, setFilterQ,
    // --- ADSR用の状態とセッターをエクスポート ---
    attack, setAttack,
    decay, setDecay,
    sustain, setSustain,
    release, setRelease,
    analyserRef,
  };
}