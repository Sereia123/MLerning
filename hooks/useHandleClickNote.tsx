import useSyntheWorklet from "./useSyntheWorklet";

export default function useHandleClickNote() {
  const { playMidi } = useSyntheWorklet();

  function handleClickNote(f: number): React.MouseEventHandler<HTMLDivElement> {
    return function () {
      playMidi(f);
    };
  }

  return handleClickNote;
}