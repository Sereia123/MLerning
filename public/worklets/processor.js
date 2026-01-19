// public/worklets/processor.js

// 波形を生成するヘルパー関数
const wave = (phase, type, pulseWidth) => {
  const p = phase % (2 * Math.PI);
  switch (type) {
    case 1: // Sine
      return Math.sin(phase);
    case 2: // Sawtooth
      return p / Math.PI - 1;
    case 3: // Triangle
      return 2 * Math.abs(p / Math.PI - 1) - 1;
    case 4: // Square
      return p < Math.PI ? 1 : -1;
    case 5: { // Pulse
      const width = (pulseWidth || 0.5) * 2 * Math.PI;
      return p < width ? 1 : -1;
    }
    default:
      return Math.sin(phase);
  }
};

class Processor extends AudioWorkletProcessor {
  phase = 0;
  pulseWidth = 0.5;

  static get parameterDescriptors() {
    return [
      { name: 'frequency1', defaultValue: 440, automationRate: 'k-rate' },
      { name: 'wave1', defaultValue: 1, automationRate: 'k-rate' },
      { name: 'pulseWidth1', defaultValue: 0.5, automationRate: 'k-rate' },
    ];
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0][0];

    const freq = parameters.frequency1[0];
    const waveType = parameters.wave1[0];
    this.pulseWidth = parameters.pulseWidth1[0];
    const phaseStep = 2 * Math.PI * freq / sampleRate; // Access global sampleRate

    for (let i = 0; i < output.length; i++) {
      output[i] = wave(this.phase, waveType, this.pulseWidth);
      this.phase += phaseStep;
    }
    
    // Wrap phase to avoid it growing indefinitely
    this.phase %= (2 * Math.PI);

    return true;
  }
}

registerProcessor('processor', Processor);