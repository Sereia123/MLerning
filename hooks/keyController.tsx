'use client'

import { useEffect } from 'react'
import { useSynthe } from '@/hooks/SyntheProvider'

type KeyMap = Record<string, number | undefined>

export default function KeyboardController({ keyMap, onNoteDown, onNoteUp }: { keyMap: KeyMap, onNoteDown?: (midi:number)=>void, onNoteUp?: (midi:number)=>void }) {
  const { noteOn, noteOff } = useSynthe()

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
        noteOff(note)
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
