import { useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { AwarenessState, AwarenessUser, PendingMove } from '@realtimeapp/shared';

// panelId -> 現在その panel をドラッグ中(編集中)のユーザー
export function useDraggingUsers(provider: HocuspocusProvider | null): Map<string, AwarenessUser> {
  const [dragging, setDragging] = useState<Map<string, AwarenessUser>>(new Map());

  useEffect(() => {
    if (!provider) return;

    const update = () => {
      const next = new Map<string, AwarenessUser>();
      provider.awareness?.getStates().forEach((state) => {
        const awareness = state as Partial<AwarenessState>;
        if (awareness.draggingPanelId && awareness.user) {
          next.set(awareness.draggingPanelId, awareness.user);
        }
      });
      setDragging(next);
    };

    provider.awareness?.on('change', update);
    update();

    return () => {
      provider.awareness?.off('change', update);
    };
  }, [provider]);

  return dragging;
}

export interface PendingMoveEntry {
  user: AwarenessUser;
  move: PendingMove;
}

// ドロップ後・確定前の「操作中」状態を、全ユーザー分(自分自身も含む)まとめて取得する
export function usePendingMoves(provider: HocuspocusProvider | null): PendingMoveEntry[] {
  const [entries, setEntries] = useState<PendingMoveEntry[]>([]);

  useEffect(() => {
    if (!provider) return;

    const update = () => {
      const next: PendingMoveEntry[] = [];
      provider.awareness?.getStates().forEach((state) => {
        const awareness = state as Partial<AwarenessState>;
        if (awareness.pendingMoves && awareness.user) {
          for (const move of awareness.pendingMoves) {
            next.push({ user: awareness.user, move });
          }
        }
      });
      setEntries(next);
    };

    provider.awareness?.on('change', update);
    update();

    return () => {
      provider.awareness?.off('change', update);
    };
  }, [provider]);

  return entries;
}
