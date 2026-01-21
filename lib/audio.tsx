//ブラウザによる環境の違いを統一
export function getAudioContextConst(): typeof AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  );
}

//workletが使用できるかテスト
//asyncで待機
export async function loadWorkletModule(ac: AudioContext, path = '/worklets/processor.js') {
  if (typeof window === 'undefined') {
    return;
  }
  const url = new URL(path, window.location.origin).toString();
  const head = await fetch(url, { method: 'HEAD' });
  if (!head.ok) throw new Error(`Worklet not found: ${url} (${head.status})`);
  await ac.audioWorklet.addModule(url);
}