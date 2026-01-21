// public/worklets/processor.js

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
  waveType = 1; // Start with Sine wave

  constructor(options) {
    super(options);
    // Get initial waveType from parameterData, then rely on messages
    if (options && options.processorOptions && options.processorOptions.waveType) {
      this.waveType = options.processorOptions.waveType;
    }
    this.port.onmessage = (event) => {
      try {
        if (event.data.wave) {
          this.waveType = event.data.wave;
        }
      } catch (e) {
        console.error('Error in worklet onmessage:', e);
      }
    };
  }

  static get parameterDescriptors() {
    return [
      { name: 'frequency1', defaultValue: 440, automationRate: 'k-rate' },
      // wave1 is removed as it's now handled by messages
      { name: 'pulseWidth1', defaultValue: 0.5, automationRate: 'k-rate' },
    ];
  }

  process(inputs, outputs, parameters) {
    try {
      const output = outputs[0][0];

      const freq = parameters.frequency1[0];
      this.pulseWidth = parameters.pulseWidth1[0];
      const phaseStep = 2 * Math.PI * freq / sampleRate; // Access global sampleRate

      for (let i = 0; i < output.length; i++) {
        // Use the internal waveType property
        output[i] = wave(this.phase, this.waveType, this.pulseWidth);
        this.phase += phaseStep;
      }
      
      // Wrap phase to avoid it growing indefinitely
      this.phase %= (2 * Math.PI);

    } catch (e) {
      console.error('Error in worklet process:', e);
      return false; // Stop the processor if a critical error occurs
    }
    return true;
  }
}

registerProcessor('processor', Processor);