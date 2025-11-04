'use client';

import WhiteKey from "./whitekey";
import getKeyToneWhiteMap from "@/hooks/keyToneWhiteMap";
import useHandleClickNote from "@/hooks/useHandleClickNote";

type KeyboardProps = {
  keyBoardNumber: number;
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
            onClick={handleClickNote(note)}
          >
            <WhiteKey />
          </div>
        ))}
      </div>
    </>
  );
}
