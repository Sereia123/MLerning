class Processor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      //a-rateは連続値、k-rateは離散値
      { name: 'frequency', defaultValue: 440, minValue: 20, maxValue: 20000, automationRate: 'a-rate' },
      { name: 'gain',      defaultValue: 0.2, minValue: 0,   maxValue: 1,     automationRate: 'a-rate' },
      //波形は 0: sine, 1: square, 2: saw, 3: triangle, 4: noiseとなる
      { name: 'wave',       defaultValue: 0,    minValue: 0,     maxValue: 4,     automationRate: 'k-rate' },
      //どこから-1でどこから+1にするのかを決めるパラメータ
      { name: 'pulseWidth', defaultValue: 0.5,  minValue: 0.01,  maxValue: 0.99,  automationRate: 'k-rate' }
    
    ];
  }

  constructor() {
    super();
    this._phase = 0;

    // リセットしたいとき用 以降呼ばれたら発動
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'resetPhase') this._phase = 0;
    };

    // デバッグ: main スレッドに sampleRate 情報を一度送る
    try {
      this.port.postMessage({ type: 'debug', sampleRate });
    } catch {
      // ignore
    }
  }

  //サイン波
  _sine(phase) {
    return Math.sin(phase);
  }

  //矩形波
  _square(phase, pulseWidth) {
    return (phase % (2 * Math.PI)) < (2 * Math.PI * pulseWidth) ? 1 : -1;
  }

  //正弦波
  _saw(phase) {
    return 2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + 0.5));
  }

  //三角波
  _triangle(phase) {
    return Math.asin(Math.sin(phase)) * (2 / Math.PI);
  }

  //ノイズ
  _noise() {
    return Math.random() * 2 - 1;
  }


  process(inputs, outputs, parameters) {
    const output = outputs[0];//LR所属
    const freq = parameters.frequency;
    const gain = parameters.gain;
    const wave = parameters.wave;
    const pw = parameters.pulseWidth;
    const sr = globalThis.sampleRate;
    const twoPi = 2 * Math.PI;
    const waveType = wave[0] | 0;//波形の型を整数に変換
    const pulseWidth = Math.min(Math.max(pw[0], 0.01), 0.99);//下限、上限の設定

    const frames = (output[0] && output[0].length) ? output[0].length : 0;
    for (let i = 0; i < frames; i++) {
      const f = freq.length > 1 ? freq[i] : freq[0]; // a-rate 対応
      const g = gain.length > 1 ? gain[i] : gain[0];

      let sample;
      switch (waveType) {
        case 1:
          sample = this._square(this._phase, pulseWidth);
          break;
        case 2:
          sample = this._saw(this._phase);
          break;
        case 3:
          sample = this._triangle(this._phase);
          break;
        case 4:
          sample = this._noise();
          break;
        case 0:
        default:
          sample = this._sine(this._phase);
          break;
      }

      const outSample = sample * g;
      for (let ch = 0; ch < output.length; ch++) {
        output[ch][i] = outSample;
      }

      // 位相はフレームごとに1回だけ進める
      this._phase += twoPi * f / sr;
      if (this._phase > 1e9) this._phase %= twoPi;
    }

    return true;
  }
}

registerProcessor('processor', Processor);//登録


