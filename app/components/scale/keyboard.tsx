'use client';

import WhiteKey from "./whitekey";
import BlackKey from "./blackkey";
import getKeyToneWhiteMap from "@/logic/scaleKeyToneWhiteMap";
import getKeyToneBlackMap from "@/logic/scaleKeyToneBlackMap";

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
            onMouseDown={(e) => {
              e.stopPropagation();
              onMouseDown?.(note)();
              onNoteDown?.(note);
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              onMouseUp?.(note)();
              onNoteUp?.(note);
            }}
            onMouseLeave={(e) => { e.stopPropagation(); onMouseUp?.(note)(); onNoteUp?.(note);}}
          >
            <WhiteKey isActive={activeKeys?.includes(note)} />
          </div>
        ))}

        <div className="absolute z-10 top-0 left-0 w-full h-[100px] flex">
           {keyToneBlackMap.map(([x, note], idx) => (
            <div
              key={idx}
              style={{ transform: `translateX(${x}px)` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown?.(note)();
                onNoteDown?.(note);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                onMouseUp?.(note)();
                onNoteUp?.(note);
              }}
              onMouseLeave={(e) => { e.stopPropagation(); onMouseUp?.(note)(); onNoteUp?.(note);}}
            >
              <BlackKey isActive={activeKeys?.includes(note)} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}