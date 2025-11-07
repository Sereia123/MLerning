'use client';

import WhiteKey from "./whitekey";
import BlackKey from "./blackkey";
import getKeyToneWhiteMap from "@/hooks/scaleKeyToneWhiteMap";
import getKeyToneBlackMap from "@/hooks/scaleKeyToneBlackMap";

type KeyboardProps = {
  keyBoardNumber: number;
  activeKeys?: number[];
  onNoteDown?: (midi: number) => void;
  onNoteUp?: (midi: number) => void;
  onMouseDown?: (midi: number) => (() => void);
  onMouseUp?: (midi: number) => (() => void);
};

export default function Keyboard({ keyBoardNumber, activeKeys, onNoteDown, onNoteUp, onMouseDown, onMouseUp }: KeyboardProps) {
  const keyToneWhiteMap = getKeyToneWhiteMap(keyBoardNumber);
  const keyToneBlackMap = getKeyToneBlackMap(keyBoardNumber);

  return (
    <>
      <div className="relative w-full h-[180px] flex">
        {keyToneWhiteMap.map((note, idx) => (
          <div
            key={idx}
            className="hover:cursor-pointer"
            onMouseDown={() => {
              onMouseDown?.(note)?.();
              onNoteDown?.(note);
            }}
            onMouseUp={() => {
              onMouseUp?.(note)?.();
              onNoteUp?.(note);
            }}
            onMouseLeave={() => {
              onMouseUp?.(note)?.();
              onNoteUp?.(note);
            }}
          >
            <WhiteKey isActive={activeKeys?.includes(note)} />
          </div>
        ))}

        <div className="absolute z=10 top-0 left-0 w-full h-[100px] flex">
           {keyToneBlackMap.map(([x, note], idx) => (
            <div
              key={idx}
              style={{ transform: `translateX(${x}px)` }}
              onMouseDown={() => {
                onMouseDown?.(note)?.();
                onNoteDown?.(note);
              }}
              onMouseUp={() => {
                onMouseUp?.(note)?.();
                onNoteUp?.(note);
              }}
              onMouseLeave={() => {
                onMouseUp?.(note)?.();
                onNoteUp?.(note);
              }}
            >
              <BlackKey isActive={activeKeys?.includes(note)} />
            </div>
          ))}
          {/* <div className="translate-x-[25px]">
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
          </div> */}
        </div>
      </div>
    </>
  );
}