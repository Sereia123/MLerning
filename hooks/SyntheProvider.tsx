'use client';

import useSyntheWorklet from './useSyntheWorklet';
import { createContext, useContext, ReactNode } from 'react';

// useSyntheWorkletフックの戻り値の型を定義
type SyntheContextType = ReturnType<typeof useSyntheWorklet>;

// Contextを作成。初期値はnull
const SyntheContext = createContext<SyntheContextType | null>(null);

// グローバルなシンセサイザーの状態を提供するProviderコンポーネント
export function SyntheProvider({ children }: { children: ReactNode }) {
  const synthe = useSyntheWorklet();
  return (
    <SyntheContext.Provider value={synthe}>{children}</SyntheContext.Provider>
  );
}

// 各コンポーネントからシンセサイザーの状態にアクセスするためのカスタムフック
export function useSynthe() {
  const context = useContext(SyntheContext);
  if (!context) {
    throw new Error('useSynthe must be used within a SyntheProvider');
  }
  return context;
}
