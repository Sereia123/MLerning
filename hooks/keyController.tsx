'use client'

import { useEffect } from 'react'
import useSyntheWorklet from '@/hooks/useSyntheWorklet'

type KeyMap = Record<string, number | undefined>

export default function KeyboardController({ keyMap, onNoteDown, onNoteUp }: { keyMap: KeyMap, onNoteDown?: (midi:number)=>void, onNoteUp?: (midi:number)=>void }) {
  const { playMidi, noteOff } = useSyntheWorklet()

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const note = keyMap[e.key]
      if (note !== undefined) {
        playMidi(note);
        onNoteDown?.(note);
      }
    }
    const onUp = (e: KeyboardEvent) => {
      const note = keyMap[e.key]
      if (note !== undefined) {
        noteOff()
        onNoteUp?.(note);
      }
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [keyMap, playMidi, noteOff, onNoteDown, onNoteUp])

  return null
}
