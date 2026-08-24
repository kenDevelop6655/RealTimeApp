const GAP = 1000;

// fractional index方式: 隣接パネルのorderの中間値を採番することで、
// Y.Array.moveや配列の削除/挿入を使わずにパネル単体のフィールド更新だけで並び替え・ライン間移動を表現する
export function computeOrder(prevOrder: number | null, nextOrder: number | null): number {
  if (prevOrder === null && nextOrder === null) return 0;
  if (prevOrder === null) return nextOrder! - GAP;
  if (nextOrder === null) return prevOrder + GAP;
  return (prevOrder + nextOrder) / 2;
}
