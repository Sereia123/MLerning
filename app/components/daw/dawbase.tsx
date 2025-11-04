'use client';

import getKeyToneBlackMap from '@/hooks/keyToneBlackMap';
import KeyMap from '@/hooks/keyMap';
import Keyboard from "./keyboard";
import BlackKey from "./blackkey";
import Notes from "./notes";
import useHandleClickNote from '@/hooks/useHandleClickNote';
import KeyboardController from '@/hooks/keyController';

export default function DawBase(){

  const keyBoardNumber = 5;//盤面のモードチェンジ

  const handleClickNote = useHandleClickNote();

  const keyToneBlackMap = getKeyToneBlackMap(keyBoardNumber);

  const keyMap = KeyMap(keyBoardNumber);
  
  return (
    <>
      <KeyboardController keyMap={keyMap}/>
      <div className="relative flex mx-auto h-[480px] w-[800px] bg-white">
        <Keyboard keyBoardNumber={keyBoardNumber} />
        {Array.from({ length: 8 }).map((_, idx) => (
          <Notes key={idx} keyBoardNumber={keyBoardNumber} />
        ))}

        {/* 黒鍵 */}
        <div className="absolute top-0 left-0 z-10 h-[480px] w-[10%]">
          {keyToneBlackMap.map(([y, note], idx) => (
            <div
              key={idx}
              style={{ transform: `translateY(${y}px)` }} 
              onClick={handleClickNote(note)}
            >
              <BlackKey />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}