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

  const handleClickNote = useHandleClickNote();
  return (
    <>
      <div className="h-full w-[20%] bg-gray-700">
        {keyToneMap.map((note, idx) => (
          <div
            key={idx}
            onClick={(e) => { handleClickNote(note)(e); props.onNoteDown?.(note); setTimeout(()=>props.onNoteUp?.(note), 200); }}
          >
            <WhiteKey isActive={props.activeKeys?.includes(note)} />
          </div>
        ))}
      </div>
    </>
  );
}
