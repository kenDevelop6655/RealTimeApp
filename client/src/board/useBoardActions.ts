import { useCallback } from 'react';
import * as Y from 'yjs';
import type { LineDto, PanelDto } from '@realtimeapp/shared';
import { recordHistory } from '../api/history';
import { computeOrder } from './order';
import type { Columns } from './columns';

interface Params {
  ydoc: Y.Doc;
  token: string | null;
  panels: PanelDto[];
}

export function useBoardActions({ ydoc, token, panels }: Params) {
  const addPanel = useCallback(
    async (line: LineDto, name: string) => {
      if (!token) return;
      const panelsInLine = panels.filter((p) => p.lineId === line.id).sort((a, b) => a.order - b.order);
      const lastOrder = panelsInLine.length > 0 ? panelsInLine[panelsInLine.length - 1].order : null;
      const order = computeOrder(lastOrder, null);
      const id = crypto.randomUUID();

      const panelYMap = new Y.Map<unknown>();
      panelYMap.set('id', id);
      panelYMap.set('name', name);
      panelYMap.set('lineId', line.id);
      panelYMap.set('order', order);
      panelYMap.set('createdAt', Date.now());

      ydoc.transact(() => {
        ydoc.getMap('panels').set(id, panelYMap);
      });

      await recordHistory(token, {
        panelId: id,
        panelName: name,
        action: 'add',
        toLineId: line.id,
        toIndex: panelsInLine.length,
      });
    },
    [ydoc, token, panels]
  );

  const removePanel = useCallback(
    async (panel: PanelDto) => {
      if (!token) return;
      const panelsInLine = panels.filter((p) => p.lineId === panel.lineId).sort((a, b) => a.order - b.order);
      const fromIndex = panelsInLine.findIndex((p) => p.id === panel.id);

      ydoc.transact(() => {
        ydoc.getMap('panels').delete(panel.id);
      });

      await recordHistory(token, {
        panelId: panel.id,
        panelName: panel.name,
        action: 'remove',
        fromLineId: panel.lineId,
        fromIndex: fromIndex >= 0 ? fromIndex : null,
      });
    },
    [ydoc, token, panels]
  );

  const commitMove = useCallback(
    async (panelId: string, targetLineId: string, columns: Columns) => {
      if (!token) return;
      const panelsById = new Map(panels.map((p) => [p.id, p]));
      const original = panelsById.get(panelId);
      if (!original) return;

      const originalLinePanels = panels
        .filter((p) => p.lineId === original.lineId)
        .sort((a, b) => a.order - b.order);
      const fromIndex = originalLinePanels.findIndex((p) => p.id === panelId);

      const targetOrder = columns[targetLineId] ?? [];
      const toIndex = targetOrder.indexOf(panelId);
      if (toIndex === -1) return;

      const prevId = targetOrder[toIndex - 1];
      const nextId = targetOrder[toIndex + 1];
      const prevOrder = prevId ? panelsById.get(prevId)?.order ?? null : null;
      const nextOrder = nextId ? panelsById.get(nextId)?.order ?? null : null;
      const newOrder = computeOrder(prevOrder, nextOrder);

      const noOp = original.lineId === targetLineId && original.order === newOrder && fromIndex === toIndex;
      if (noOp) return;

      ydoc.transact(() => {
        const panelYMap = ydoc.getMap('panels').get(panelId) as Y.Map<unknown> | undefined;
        panelYMap?.set('lineId', targetLineId);
        panelYMap?.set('order', newOrder);
      });

      await recordHistory(token, {
        panelId,
        panelName: original.name,
        action: 'move',
        fromLineId: original.lineId,
        toLineId: targetLineId,
        fromIndex,
        toIndex,
      });
    },
    [ydoc, token, panels]
  );

  return { addPanel, removePanel, commitMove };
}
