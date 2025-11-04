import RhythmBoard from "./rhythmboard";

export default function RhythmBase(){
  return (
    <>
      <div className="mx-auto flex items-center h-[480px] w-[800px] bg-white">
        <RhythmBoard />
      </div>
    </>
  );
}