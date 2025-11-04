import Category from "./category";
import Typing from "./rhythmtyping";

export default function RhythmBoard(){
  return (
    <>
      <div className="w-full h-[70%] bg-green-50 flex">
        <Category />
        <Typing />
      </div>
    </>
  );
}