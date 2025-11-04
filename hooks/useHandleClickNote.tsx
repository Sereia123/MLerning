import useSyntheWorklet from "./useSyntheWorklet";
import midiToFreq from "./midiToFreq";

export default function useHandleClickNote() {
  const { setFreq, trigger } = useSyntheWorklet();

  function handleClickNote(f: number): React.MouseEventHandler<HTMLDivElement> {
    return function () {
      setFreq(midiToFreq(f));
      trigger();
    };
  }

  return handleClickNote;
}
