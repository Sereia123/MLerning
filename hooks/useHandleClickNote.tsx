import useSyntheWorklet from "./useSyntheWorklet";

export default function useHandleClickNote() {
  const { noteOn, noteOff } = useSyntheWorklet();

  function handleMouseDown(f: number): () => void {
    return function () {
      noteOn(f);
    };
  }

  function handleMouseUp(f: number): () => void {
    return function () {
      void f;
      noteOff();
    };
  }

  return { handleMouseDown, handleMouseUp };
}