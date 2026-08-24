import type { LineDto, PanelDto } from '@realtimeapp/shared';

export type Columns = Record<string, string[]>;

export function buildColumns(lines: LineDto[], panels: PanelDto[]): Columns {
  const columns: Columns = {};
  for (const line of lines) {
    columns[line.id] = [];
  }

  const byLine = new Map<string, PanelDto[]>();
  for (const panel of panels) {
    const list = byLine.get(panel.lineId) ?? [];
    list.push(panel);
    byLine.set(panel.lineId, list);
  }

  for (const [lineId, list] of byLine) {
    if (!columns[lineId]) columns[lineId] = [];
    columns[lineId] = list.sort((a, b) => a.order - b.order).map((p) => p.id);
  }

  return columns;
}

export function findContainer(columns: Columns, panelId: string): string | undefined {
  return Object.keys(columns).find((lineId) => columns[lineId].includes(panelId));
}
