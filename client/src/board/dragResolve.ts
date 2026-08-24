import type { Columns } from './columns';
import { findContainer } from './columns';

// ドラッグ中にライン(コンテナ)をまたいだ場合の一覧を更新する(dnd-kit公式のmulti-containers例に準拠)
export function moveAcrossContainers(columns: Columns, activeId: string, overId: string): Columns {
  const activeContainer = findContainer(columns, activeId);
  const overContainer = columns[overId] ? overId : findContainer(columns, overId);

  if (!activeContainer || !overContainer || activeContainer === overContainer) {
    return columns;
  }

  const activeItems = columns[activeContainer];
  const overItems = columns[overContainer];
  const overIndex = overItems.indexOf(overId);
  // overIdがライン自体(空きスペースへのドロップ)の場合は先頭に挿入する
  const newIndex = overId in columns ? 0 : overIndex >= 0 ? overIndex : overItems.length;

  return {
    ...columns,
    [activeContainer]: activeItems.filter((id) => id !== activeId),
    [overContainer]: [...overItems.slice(0, newIndex), activeId, ...overItems.slice(newIndex)],
  };
}
