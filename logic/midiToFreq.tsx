export default function midiToFreq(data1: number): number {
  const baseFreq = 440.0; // A4
  const baseNote = 69;    // A4のMIDIノート番号
  return baseFreq * Math.pow(2, (data1 - baseNote) / 12);
}