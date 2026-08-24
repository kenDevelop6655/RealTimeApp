import type { PanelDto } from '@realtimeapp/shared';

export function PanelOverlay({ panel }: { panel: PanelDto }) {
  return (
    <div className="panel panel-overlay">
      <span className="panel-name">{panel.name}</span>
    </div>
  );
}
