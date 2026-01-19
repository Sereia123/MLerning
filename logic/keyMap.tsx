import getKeyToneBlackMap from '@/logic/keyToneBlackMap';
import getKeyToneWhiteMap from '@/logic/keyToneWhiteMap';

type KeyMap = Record<string, number | undefined>;

export default function KeyMap(keyBoardNumber: number): KeyMap {
  const keytoneWhiteMap = getKeyToneWhiteMap(keyBoardNumber);
  const keyToneBlackMap = getKeyToneBlackMap(keyBoardNumber);

  const keyMap: KeyMap = {
    a: keytoneWhiteMap[11],
    s: keytoneWhiteMap[10],
    d: keytoneWhiteMap[9],
    f: keytoneWhiteMap[8],
    g: keytoneWhiteMap[7],
    h: keytoneWhiteMap[6],
    j: keytoneWhiteMap[5],
    k: keytoneWhiteMap[4],
    l: keytoneWhiteMap[3],
    ';': keytoneWhiteMap[2],
    ':': keytoneWhiteMap[1],
    ']': keytoneWhiteMap[0],

  w: keyToneBlackMap.find(([, note]) => (keytoneWhiteMap[11] < note) && (note < keytoneWhiteMap[10]))?.[1] ?? undefined,
  e: keyToneBlackMap.find(([, note]) => (keytoneWhiteMap[10] < note) && (note < keytoneWhiteMap[9]))?.[1] ?? undefined,
  r: keyToneBlackMap.find(([, note]) => (keytoneWhiteMap[9] < note) && (note < keytoneWhiteMap[8]))?.[1] ?? undefined,
  t: keyToneBlackMap.find(([, note]) => (keytoneWhiteMap[8] < note) && (note < keytoneWhiteMap[7]))?.[1] ?? undefined,
  y: keyToneBlackMap.find(([, note]) => (keytoneWhiteMap[7] < note) && (note < keytoneWhiteMap[6]))?.[1] ?? undefined,
  u: keyToneBlackMap.find(([, note]) => (keytoneWhiteMap[6] < note) && (note < keytoneWhiteMap[5]))?.[1] ?? undefined,
  i: keyToneBlackMap.find(([, note]) => (keytoneWhiteMap[5] < note) && (note < keytoneWhiteMap[4]))?.[1] ?? undefined,
  o: keyToneBlackMap.find(([, note]) => (keytoneWhiteMap[4] < note) && (note < keytoneWhiteMap[3]))?.[1] ?? undefined,
  p: keyToneBlackMap.find(([, note]) => (keytoneWhiteMap[3] < note) && (note < keytoneWhiteMap[2]))?.[1] ?? undefined,
  '@': keyToneBlackMap.find(([, note]) => (keytoneWhiteMap[2] < note) && (note < keytoneWhiteMap[1]))?.[1] ?? undefined,
  '[': keyToneBlackMap.find(([, note]) => (keytoneWhiteMap[1] < note) && (note < keytoneWhiteMap[0]))?.[1] ?? undefined,
  };

  return keyMap;
}