import { useState, type FormEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import type { AwarenessUser, LineDto, PanelDto } from '@realtimeapp/shared';
import { Panel } from './Panel';

interface OperatingBadge {
  userName: string;
  color: string;
  mine: boolean;
}

interface Props {
  line: LineDto;
  panelIds: string[];
  panelsById: Map<string, PanelDto>;
  draggingUsers: Map<string, AwarenessUser>;
  operating?: OperatingBadge;
  dragLocked: boolean;
  pendingPanelIds: Set<string>;
  onDelete: (panel: PanelDto) => void;
  onAdd: (line: LineDto, name: string) => void;
}

export function Line({
  line,
  panelIds,
  panelsById,
  draggingUsers,
  operating,
  dragLocked,
  pendingPanelIds,
  onDelete,
  onAdd,
}: Props) {
  const { setNodeRef } = useDroppable({ id: line.id, disabled: dragLocked });
  const [newName, setNewName] = useState('');

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || dragLocked) return;
    onAdd(line, name);
    setNewName('');
  }

  return (
    <div className={`line${operating ? ' is-operating' : ''}`} style={operating ? { borderColor: operating.color } : undefined}>
      <div className="line-header">
        <h2>{line.name}</h2>
        {operating && (
          <span className="line-operating-badge" style={{ backgroundColor: operating.color }}>
            {operating.mine ? '操作中(自分)' : `${operating.userName} が操作中`}
          </span>
        )}
        <form className="line-add-form" onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="パネルを追加"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={dragLocked}
          />
          <button type="submit" disabled={dragLocked}>
            追加
          </button>
        </form>
      </div>
      <div ref={setNodeRef} className="line-track">
        <SortableContext items={panelIds} strategy={horizontalListSortingStrategy}>
          {panelIds.map((id) => {
            const panel = panelsById.get(id);
            if (!panel) return null;
            const isPending = pendingPanelIds.has(id);
            return (
              <Panel
                key={id}
                panel={panel}
                editingUser={draggingUsers.get(id)}
                disabled={dragLocked || isPending}
                pending={isPending}
                onDelete={onDelete}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}
