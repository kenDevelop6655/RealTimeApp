import { useState, type FormEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import type { AwarenessUser, LineDto, PanelDto } from '@realtimeapp/shared';
import { Panel } from './Panel';

interface Props {
  line: LineDto;
  panelIds: string[];
  panelsById: Map<string, PanelDto>;
  draggingUsers: Map<string, AwarenessUser>;
  onDelete: (panel: PanelDto) => void;
  onAdd: (line: LineDto, name: string) => void;
}

export function Line({ line, panelIds, panelsById, draggingUsers, onDelete, onAdd }: Props) {
  const { setNodeRef } = useDroppable({ id: line.id });
  const [newName, setNewName] = useState('');

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onAdd(line, name);
    setNewName('');
  }

  return (
    <div className="line">
      <div className="line-header">
        <h2>{line.name}</h2>
        <form className="line-add-form" onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="パネルを追加"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit">追加</button>
        </form>
      </div>
      <div ref={setNodeRef} className="line-track">
        <SortableContext items={panelIds} strategy={horizontalListSortingStrategy}>
          {panelIds.map((id) => {
            const panel = panelsById.get(id);
            if (!panel) return null;
            return (
              <Panel key={id} panel={panel} editingUser={draggingUsers.get(id)} onDelete={onDelete} />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}
