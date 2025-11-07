import { useSynthe } from "@/hooks/SyntheProvider";

export default function useHandleClickNote() {
  const { noteOn, noteOff } = useSynthe();

  function handleMouseDown(f: number): () => void {
    return function () {
      noteOn(f);
    };
  }

  function handleMouseUp(f: number): () => void {
    return function () {
      noteOff(f);
    };
  }

  return { handleMouseDown, handleMouseUp };
}