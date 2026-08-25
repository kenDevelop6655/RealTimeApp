import { useCallback } from 'react';
import * as Y from 'yjs';
import type {
  LineDto,
  PanelDto,
  PendingAction,
  PendingAddAction,
  PendingMoveAction,
  PendingRemoveAction,
} from '@realtimeapp/shared';
import { recordHistory } from '../api/history';
import { computeOrder } from './order';

interface Params {
  ydoc: Y.Doc;
  token: string | null;
  panels: PanelDto[];
  lines: LineDto[];
}

function panelsInLine(list: PanelDto[], lineId: string): PanelDto[] {
  return list.filter((p) => p.lineId === lineId).sort((a, b) => a.order - b.order);
}

async function commitAdd(
  action: PendingAddAction,
  working: PanelDto[],
  token: string,
  confirmationId: string,
  ydoc: Y.Doc
): Promise<PanelDto[]> {
  const siblings = panelsInLine(working, action.lineId);
  const lastOrder = siblings.length > 0 ? siblings[siblings.length - 1].order : null;
  const order = computeOrder(lastOrder, null);
  const createdAt = Date.now();

  const panelYMap = new Y.Map<unknown>();
  panelYMap.set('id', action.panelId);
  panelYMap.set('name', action.panelName);
  panelYMap.set('lineId', action.lineId);
  panelYMap.set('order', order);
  panelYMap.set('createdAt', createdAt);

  ydoc.transact(() => {
    ydoc.getMap('panels').set(action.panelId, panelYMap);
  });

  await recordHistory(token, {
    panelId: action.panelId,
    panelName: action.panelName,
    action: 'add',
    toLineId: action.lineId,
    toIndex: siblings.length,
    confirmationId,
  });

  return [...working, { id: action.panelId, name: action.panelName, lineId: action.lineId, order, createdAt }];
}

async function commitRemove(
  action: PendingRemoveAction,
  working: PanelDto[],
  token: string,
  confirmationId: string,
  ydoc: Y.Doc
): Promise<PanelDto[]> {
  const siblings = panelsInLine(working, action.lineId);
  const fromIndex = siblings.findIndex((p) => p.id === action.panelId);

  ydoc.transact(() => {
    ydoc.getMap('panels').delete(action.panelId);
  });

  await recordHistory(token, {
    panelId: action.panelId,
    panelName: action.panelName,
    action: 'remove',
    fromLineId: action.lineId,
    fromIndex: fromIndex >= 0 ? fromIndex : null,
    confirmationId,
  });

  return working.filter((p) => p.id !== action.panelId);
}

async function commitMove(
  action: PendingMoveAction,
  working: PanelDto[],
  token: string,
  confirmationId: string,
  ydoc: Y.Doc
): Promise<PanelDto[] | null> {
  const panelsById = new Map(working.map((p) => [p.id, p]));
  const original = panelsById.get(action.panelId);
  if (!original) return null;

  const fromIndex = panelsInLine(working, original.lineId).findIndex((p) => p.id === action.panelId);

  const targetOrder = action.toLineOrder;
  const toIndex = targetOrder.indexOf(action.panelId);
  if (toIndex === -1) return null;

  const prevId = targetOrder[toIndex - 1];
  const nextId = targetOrder[toIndex + 1];
  const prevOrder = prevId ? panelsById.get(prevId)?.order ?? null : null;
  const nextOrder = nextId ? panelsById.get(nextId)?.order ?? null : null;
  const newOrder = computeOrder(prevOrder, nextOrder);

  const noOp = original.lineId === action.toLineId && original.order === newOrder && fromIndex === toIndex;
  if (noOp) return working;

  ydoc.transact(() => {
    const panelYMap = ydoc.getMap('panels').get(action.panelId) as Y.Map<unknown> | undefined;
    panelYMap?.set('lineId', action.toLineId);
    panelYMap?.set('order', newOrder);
  });

  await recordHistory(token, {
    panelId: action.panelId,
    panelName: original.name,
    action: 'move',
    fromLineId: original.lineId,
    toLineId: action.toLineId,
    fromIndex,
    toIndex,
    confirmationId,
  });

  return working.map((p) => (p.id === action.panelId ? { ...p, lineId: action.toLineId, order: newOrder } : p));
}

export function useBoardActions({ ydoc, token, panels, lines }: Params) {
  const addLine = useCallback(
    (name: string) => {
      const lastOrder = lines.length > 0 ? lines[lines.length - 1].order : null;
      const order = computeOrder(lastOrder, null);
      const id = crypto.randomUUID();

      ydoc.transact(() => {
        ydoc.getMap('lines').set(id, { id, name, order });
      });

      return id;
    },
    [ydoc, lines]
  );

  // 追加ボタンを押した時点ではY.Docにはまだ書き込まず、確定時に使うpanelIdだけ先に採番する
  const createPendingAdd = useCallback((line: LineDto, name: string): PendingAddAction => {
    return { kind: 'add', panelId: crypto.randomUUID(), lineId: line.id, panelName: name };
  }, []);

  const createPendingRemove = useCallback((panel: PanelDto): PendingRemoveAction => {
    return { kind: 'remove', panelId: panel.id, lineId: panel.lineId, panelName: panel.name };
  }, []);

  // 確定ボタン押下時、キューに溜まった未確定操作(移動/追加/削除)をまとめてY.Docへ適用し、
  // 1件ずつHistoryとして記録する。working配列は同一バッチ内の他の操作結果を後続の操作から
  // 参照できるよう、ydoc反映のたびに手元で更新していく(Reactのpanels stateは非同期にしか更新されないため)
  const confirmActions = useCallback(
    async (actions: PendingAction[], confirmationId: string) => {
      if (!token) return;
      let working = panels;

      for (const action of actions) {
        if (action.kind === 'move') {
          const result = await commitMove(action, working, token, confirmationId, ydoc);
          if (result) working = result;
        } else if (action.kind === 'add') {
          working = await commitAdd(action, working, token, confirmationId, ydoc);
        } else {
          working = await commitRemove(action, working, token, confirmationId, ydoc);
        }
      }
    },
    [ydoc, token, panels]
  );

  return { addLine, createPendingAdd, createPendingRemove, confirmActions };
}
