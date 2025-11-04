'use client';

import { useState } from 'react';
import getKeyToneBlackMap from '@/hooks/keyToneBlackMap';
import KeyMap from '@/hooks/keyMap';
import Keyboard from "./keyboard";
import BlackKey from "./blackkey";
import Notes from "./notes";
import useHandleClickNote from '@/hooks/useHandleClickNote';
import KeyboardController from '@/hooks/keyController';

export default function DawBase(){

  const keyBoardNumber = 5;//盤面のモードチェンジ

  const { handleMouseDown, handleMouseUp } = useHandleClickNote();

  const [pressedKeys, setPressedKeys] = useState<number[]>([]);

  const handleNoteDown = (midi: number) => {
    setPressedKeys((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
  };

  const handleNoteUp = (midi: number) => {
    setPressedKeys((prev) => prev.filter((n) => n !== midi));
  };

  const keyToneBlackMap = getKeyToneBlackMap(keyBoardNumber);

  const keyMap = KeyMap(keyBoardNumber);
  
  return (
    <>
      <KeyboardController keyMap={keyMap} onNoteDown={handleNoteDown} onNoteUp={handleNoteUp} />
      <div className="relative flex mx-auto h-[480px] w-[800px] bg-white">
        <Keyboard keyBoardNumber={keyBoardNumber} activeKeys={pressedKeys} onNoteDown={handleNoteDown} onNoteUp={handleNoteUp} />
        {Array.from({ length: 8 }).map((_, idx) => (
          <Notes key={idx} keyBoardNumber={keyBoardNumber} />
        ))}

        {/* 黒鍵 */}
        <div className="absolute top-0 left-0 z-10 h-[480px] w-[10%]">
          {keyToneBlackMap.map(([y, note], idx) => (
              <div
              key={idx}
              style={{ transform: `translateY(${y}px)` }} 
              onMouseDown={() => { handleMouseDown(note)(); handleNoteDown(note); }}
              onMouseUp={() => { handleMouseUp(note)(); handleNoteUp(note); }}
              onMouseLeave={() => { handleMouseUp(note)(); handleNoteUp(note); }}
              onTouchStart={() => { handleMouseDown(note)(); handleNoteDown(note); }}
              onTouchEnd={() => { handleMouseUp(note)(); handleNoteUp(note); }}
            >
              <BlackKey isActive={pressedKeys.includes(note)} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}