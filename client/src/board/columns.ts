import type { LineDto, PanelDto, PendingAction } from '@realtimeapp/shared';

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

// 「操作中」の未確定な操作(移動/追加/削除)を、確定前のプレビューとしてcolumnsへ反映する
export function applyPendingAction(columns: Columns, action: PendingAction): Columns {
  if (action.kind === 'move') {
    return {
      ...columns,
      [action.fromLineId]: action.fromLineOrder,
      [action.toLineId]: action.toLineOrder,
    };
  }

  const existing = columns[action.lineId] ?? [];
  if (action.kind === 'add') {
    return existing.includes(action.panelId)
      ? columns
      : { ...columns, [action.lineId]: [...existing, action.panelId] };
  }

  return { ...columns, [action.lineId]: existing.filter((id) => id !== action.panelId) };
}

// 操作中バッジ・ロック対象として影響を受けるライン一覧(moveはfrom/toの2ライン、add/removeは対象の1ライン)
export function pendingActionLineIds(action: PendingAction): string[] {
  return action.kind === 'move' ? [action.fromLineId, action.toLineId] : [action.lineId];
}
