import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PanelDto, AwarenessUser } from '@realtimeapp/shared';

interface Props {
  panel: PanelDto;
  editingUser?: AwarenessUser;
  disabled?: boolean;
  onDelete: (panel: PanelDto) => void;
}

export function Panel({ panel, editingUser, disabled, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: panel.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    borderColor: editingUser ? editingUser.color : undefined,
    cursor: disabled ? 'not-allowed' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="panel"
      {...attributes}
      {...(disabled ? {} : listeners)}
    >
      <span className="panel-name">{panel.name}</span>
      {editingUser && (
        <span className="panel-editing-badge" style={{ backgroundColor: editingUser.color }}>
          {editingUser.name} 編集中
        </span>
      )}
      <button
        type="button"
        className="panel-delete"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onDelete(panel)}
        disabled={disabled}
      >
        ×
      </button>
    </div>
  );
}
