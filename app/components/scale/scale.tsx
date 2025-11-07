'use client';

import { useState } from 'react';
import Keyboard from "./keyboard";
import useHandleClickNote from "@/hooks/useHandleClickNote";
import KeyboardController from '@/hooks/keyController';
import KeyMap from '@/hooks/keyMap';
import { useSynthe } from '@/hooks/SyntheProvider';

export default function ScaleBase(){
  const [keyBoardNumber, setKeyBoardNumber] = useState(5); //盤面のモードチェンジ
  const { handleMouseDown, handleMouseUp } = useHandleClickNote();
  const { mode, setMode } = useSynthe();
  const [pressedKeys, setPressedKeys] = useState<number[]>([]);

  const handleNoteDown = (midi: number) => {
    setPressedKeys((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
  };

  const handleNoteUp = (midi: number) => {
    setPressedKeys((prev) => prev.filter((n) => n !== midi));
  };

  return (
    <>
      <div className="mx-auto w-[720px] p-4 flex justify-between items-center">
        <div>
          <label htmlFor="key-select" className="text-white mr-2">KeyScale:</label>
          <select
            id="key-select"
            value={keyBoardNumber}
            onChange={(e) => setKeyBoardNumber(Number(e.target.value))}
            className="bg-gray-700 text-white p-2 rounded"
          >
            {[...Array(7).keys()].map(i => (
              <option key={i} value={i}>
                Mode {i}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="mode-select" className="text-white mr-2">Mode:</label>
          <select
            id="mode-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'poly' | 'mono')}
            className="bg-gray-700 text-white p-2 rounded"
          >
            <option value="poly">Poly</option>
            <option value="mono">Mono</option>
          </select>
        </div>
      </div>
      <div className="mx-auto flex items-center h-[300px] w-[720px]">
        <KeyboardController 
          keyMap={KeyMap(keyBoardNumber)} 
          onNoteDown={handleNoteDown} 
          onNoteUp={handleNoteUp} 
        />
        <Keyboard 
          keyBoardNumber={keyBoardNumber}
          activeKeys={pressedKeys}
          onNoteDown={handleNoteDown}
          onNoteUp={handleNoteUp}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        />
      </div>
    </>
  );
}