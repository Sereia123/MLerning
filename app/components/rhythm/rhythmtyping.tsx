import Measure from "./measure";
import Beat from "./beat";
import HatType from "./hattype";
import SnareType from "./snaretype";
import KickType from "./kicktype";


export default function Typing(){
  return (
    <>
      <div className="w-[84%] h-full flex flex-col bg-white border border-black">
        <Measure />
        <Beat />
        <HatType />
        <SnareType />
        <KickType />
      </div>
    </>
  );
}