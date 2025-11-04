'use client';

import WhiteKey from "./whitekey";
import getKeyToneWhiteMap from "@/hooks/keyToneWhiteMap";
import useHandleClickNote from "@/hooks/useHandleClickNote";

type KeyboardProps = {
  keyBoardNumber: number;
  activeKeys?: number[];
  onNoteDown?: (midi:number)=>void;
  onNoteUp?: (midi:number)=>void;
};

export default function Keyboard(props: KeyboardProps){

  const keyToneMap = getKeyToneWhiteMap(props.keyBoardNumber);

  const { handleMouseDown, handleMouseUp } = useHandleClickNote();
  return (
    <>
      <div className="h-full w-[20%] bg-gray-700">
        {keyToneMap.map((note, idx) => (
          <div
            key={idx}
            onMouseDown={() => { handleMouseDown(note)(); props.onNoteDown?.(note); }}
            onMouseUp={() => { handleMouseUp(note)(); props.onNoteUp?.(note); }}
            onMouseLeave={() => { handleMouseUp(note)(); props.onNoteUp?.(note); }}
            onTouchStart={() => { handleMouseDown(note)(); props.onNoteDown?.(note); }}
            onTouchEnd={() => { handleMouseUp(note)(); props.onNoteUp?.(note); }}
          >
            <WhiteKey isActive={props.activeKeys?.includes(note)} />
          </div>
        ))}
      </div>
    </>
  );
}
