'use client';

import WhiteKey from "./whitekey";
import BlackKey from "./blackkey";
import getKeyToneWhiteMap from "@/hooks/keyToneWhiteMap";
import useHandleClickNote from "@/hooks/useHandleClickNote";

export default function Keyboard(){
  const keyToneMap = getKeyToneWhiteMap(5);

  const handleClickNote = useHandleClickNote();
  return (
    <>
      <div className="relative w-full h-[150px] flex">
        {keyToneMap.map((note, idx) => (
          <div
            key={idx}
            onClick={handleClickNote(note)}
          >
            <WhiteKey />
          </div>
        ))}

        <div className="absolute z=10 top-0 left-0 w-full h-[200px] flex">
          <div className="translate-x-[25px]">
            <BlackKey />
          </div>
          <div className="translate-x-[35px]">
            <BlackKey />
          </div>
          <div className="translate-x-[85px]">
            <BlackKey />
          </div>
          <div className="translate-x-[95px]">
            <BlackKey />
          </div>
          <div className="translate-x-[105px]">
            <BlackKey />
          </div>
          <div className="translate-x-[155px]">
            <BlackKey />
          </div>
          <div className="translate-x-[165px]">
            <BlackKey />
          </div>
          <div className="translate-x-[215px]">
            <BlackKey />
          </div>
          <div className="translate-x-[225px]">
            <BlackKey />
          </div>
          <div className="translate-x-[235px]">
            <BlackKey />
          </div>
          <div className="translate-x-[285px]">
            <BlackKey />
          </div>
          <div className="translate-x-[295px]">
            <BlackKey />
          </div>
          <div className="translate-x-[345px]">
            <BlackKey />
          </div>
          <div className="translate-x-[355px]">
            <BlackKey />
          </div>
        </div>
      </div>
    </>
  );
}