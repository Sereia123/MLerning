'use client'

import { useEffect } from 'react'
import useSyntheWorklet from '@/hooks/useSyntheWorklet'

type KeyMap = Record<string, number | undefined>

export default function KeyboardController({ keyMap, onNoteDown, onNoteUp }: { keyMap: KeyMap, onNoteDown?: (midi:number)=>void, onNoteUp?: (midi:number)=>void }) {
  const { noteOn, noteOff } = useSyntheWorklet()

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const note = keyMap[e.key]
      if (note !== undefined) {
        noteOn(note);
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
  }, [keyMap, noteOn, noteOff, onNoteDown, onNoteUp])

  return null
}
