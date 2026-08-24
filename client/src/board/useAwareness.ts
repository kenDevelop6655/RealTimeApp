import { useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { AwarenessState, AwarenessUser } from '@realtimeapp/shared';

// panelId -> 現在その panel をドラッグ中のユーザー
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
