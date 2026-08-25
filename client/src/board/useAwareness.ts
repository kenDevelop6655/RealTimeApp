import { useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { AwarenessState, AwarenessUser, PendingAction } from '@realtimeapp/shared';

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

export interface PendingActionEntry {
  user: AwarenessUser;
  action: PendingAction;
}

// ドロップ後・確定前の「操作中」状態を、全ユーザー分(自分自身も含む)まとめて取得する
export function usePendingActions(provider: HocuspocusProvider | null): PendingActionEntry[] {
  const [entries, setEntries] = useState<PendingActionEntry[]>([]);

  useEffect(() => {
    if (!provider) return;

    const update = () => {
      const next: PendingActionEntry[] = [];
      provider.awareness?.getStates().forEach((state) => {
        const awareness = state as Partial<AwarenessState>;
        if (awareness.pendingActions && awareness.user) {
          for (const action of awareness.pendingActions) {
            next.push({ user: awareness.user, action });
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
