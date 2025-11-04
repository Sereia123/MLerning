'use client'

import { useEffect } from 'react'
import useSyntheWorklet from '@/hooks/useSyntheWorklet'
import midiToFreq from '@/hooks/midiToFreq'

type KeyMap = Record<string, number | undefined>

export default function KeyboardController({ keyMap }: { keyMap: KeyMap }) {
  const { setFreq, trigger, noteOff } = useSyntheWorklet()

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const note = keyMap[e.key]
      if (note !== undefined) {
        setFreq(midiToFreq(note));
        trigger();
      }
    }
    const onUp = (e: KeyboardEvent) => {
      if (keyMap[e.key] !== undefined) noteOff()
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [keyMap, setFreq, trigger, noteOff])

  return null
}
