import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { PanelDto } from '@realtimeapp/shared';
import { useAuth } from '../auth/AuthContext';
import { useBoardDoc } from './useBoardDoc';
import { useDraggingUsers } from './useAwareness';
import { useBoardActions } from './useBoardActions';
import { buildColumns, findContainer, type Columns } from './columns';
import { moveAcrossContainers } from './dragResolve';
import { colorForUser } from './color';
import { Line } from './Line';
import { PanelOverlay } from './PanelOverlay';

export function BoardPage() {
  const { token, user, logout } = useAuth();
  const { ydoc, provider, connected, lines, panels } = useBoardDoc(token);
  const draggingUsers = useDraggingUsers(provider);
  const { addPanel, removePanel, commitMove } = useBoardActions({ ydoc, token, panels });

  const [dragColumns, setDragColumns] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const panelsById = useMemo(() => new Map(panels.map((p) => [p.id, p])), [panels]);
  const yjsColumns = useMemo(() => buildColumns(lines, panels), [lines, panels]);
  const columns = dragColumns ?? yjsColumns;

  useEffect(() => {
    if (!provider || !user) return;
    provider.awareness?.setLocalStateField('user', {
      id: user.id,
      name: user.name,
      color: colorForUser(user.id),
    });
  }, [provider, user]);

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveId(id);
    setDragColumns(yjsColumns);
    provider?.awareness?.setLocalStateField('draggingPanelId', id);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    setDragColumns((prev) => (prev ? moveAcrossContainers(prev, active.id as string, over.id as string) : prev));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeIdValue = active.id as string;
    const base = dragColumns ?? yjsColumns;

    if (!over) {
      resetDragState();
      return;
    }

    const overId = over.id as string;
    const activeContainer = findContainer(base, activeIdValue);
    const overContainer = base[overId] ? overId : findContainer(base, overId);

    if (!activeContainer || !overContainer) {
      resetDragState();
      return;
    }

    let finalColumns = base;
    if (activeContainer === overContainer) {
      const items = base[activeContainer];
      const activeIndex = items.indexOf(activeIdValue);
      const overIndex = items.indexOf(overId);
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        finalColumns = { ...base, [activeContainer]: arrayMove(items, activeIndex, overIndex) };
      }
    }

    resetDragState();
    await commitMove(activeIdValue, overContainer, finalColumns);
  }

  function handleDragCancel(_event: DragCancelEvent) {
    resetDragState();
  }

  function resetDragState() {
    provider?.awareness?.setLocalStateField('draggingPanelId', null);
    setDragColumns(null);
    setActiveId(null);
  }

  const activePanel: PanelDto | undefined = activeId ? panelsById.get(activeId) : undefined;

  return (
    <div className="board-page">
      <header className="board-header">
        <h1>RealTimeApp</h1>
        <div className="board-header-status">
          <span className={connected ? 'status-connected' : 'status-disconnected'}>
            {connected ? '接続中' : '接続待機中...'}
          </span>
          <span>{user?.name} さん</span>
          <button type="button" onClick={logout}>
            ログアウト
          </button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="lines">
          {lines.map((line) => (
            <Line
              key={line.id}
              line={line}
              panelIds={columns[line.id] ?? []}
              panelsById={panelsById}
              draggingUsers={draggingUsers}
              onDelete={removePanel}
              onAdd={addPanel}
            />
          ))}
        </div>

        <DragOverlay>{activePanel ? <PanelOverlay panel={activePanel} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
