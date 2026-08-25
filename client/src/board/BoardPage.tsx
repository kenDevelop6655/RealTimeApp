import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { PanelDto, PendingMove } from '@realtimeapp/shared';
import { useAuth } from '../auth/AuthContext';
import { useBoardDoc } from './useBoardDoc';
import { useDraggingUsers, usePendingMoves } from './useAwareness';
import { useBoardActions } from './useBoardActions';
import { buildColumns, findContainer, applyPendingMove, type Columns } from './columns';
import { moveAcrossContainers } from './dragResolve';
import { colorForUser } from './color';
import { Line } from './Line';
import { PanelOverlay } from './PanelOverlay';

const PAGE_SIZE = 10;

export function BoardPage() {
  const { token, user, logout } = useAuth();
  const { ydoc, provider, connected, lines, panels } = useBoardDoc(token);
  const draggingUsers = useDraggingUsers(provider);
  const pendingMoves = usePendingMoves(provider);
  const { addLine, addPanel, removePanel, commitMove } = useBoardActions({ ydoc, token, panels, lines });

  const [dragColumns, setDragColumns] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [myPendingMoves, setMyPendingMoves] = useState<PendingMove[]>([]);
  const [page, setPage] = useState(0);
  const [newLineName, setNewLineName] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const panelsById = useMemo(() => new Map(panels.map((p) => [p.id, p])), [panels]);
  const yjsColumns = useMemo(() => buildColumns(lines, panels), [lines, panels]);

  // 自分・他ユーザーの「操作中」(ドロップ後・確定前)の移動結果をプレビューとして重ねる
  const previewColumns = useMemo(() => {
    let cols = yjsColumns;
    for (const move of myPendingMoves) cols = applyPendingMove(cols, move);
    for (const entry of pendingMoves) {
      if (entry.user.id === user?.id) continue;
      cols = applyPendingMove(cols, entry.move);
    }
    return cols;
  }, [yjsColumns, myPendingMoves, pendingMoves, user]);

  const columns = dragColumns ?? previewColumns;

  // closestCornersだけだと、パネルが少ない/空のラインは判定領域が狭くなり、
  // ラインの右寄り(既存パネルに近い側)でないとdragOverが発火しないことがあるため、
  // ポインタが実際に重なっている領域を優先するdnd-kit公式のmulti-containers例の判定方式を採用する
  const lastOverId = useRef<string | null>(null);

  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      const pointerIntersections = pointerWithin(args);
      const intersections = pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args);
      let overId = getFirstCollision(intersections, 'id') as string | null;

      if (overId != null) {
        const containerItems = columns[overId];
        if (containerItems && containerItems.length > 0) {
          const closest = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter(
              (container) => container.id !== overId && containerItems.includes(container.id as string)
            ),
          });
          overId = (closest[0]?.id as string | undefined) ?? overId;
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }

      // 直前まで有効だったコンテナが、その後ロックされる等でdroppable対象から外れている場合、
      // 古いIDにフォールバックしない(ポインタが動かないままロックされたラインの上に留まっても
      // ドロップ可能と誤判定してしまうため)
      if (lastOverId.current && args.droppableContainers.some((container) => container.id === lastOverId.current)) {
        return [{ id: lastOverId.current }];
      }
      lastOverId.current = null;
      return [];
    },
    [columns]
  );

  // 他ユーザーが「編集中」(ドラッグ中)または「操作中」(ドロップ後・確定前)のラインID一覧。
  // これらのラインだけをロックし、他のラインは通常通り操作できる。
  // 自分自身が関わるラインはロック対象に含めない(自分の編集中・操作中に自分の操作が不可にならないようにするため)
  const lockedLineIds = useMemo(() => {
    const set = new Set<string>();
    for (const entry of pendingMoves) {
      if (entry.user.id === user?.id) continue;
      set.add(entry.move.fromLineId);
      set.add(entry.move.toLineId);
    }
    draggingUsers.forEach((draggingUser, panelId) => {
      if (draggingUser.id === user?.id) return;
      const lineId = findContainer(previewColumns, panelId);
      if (lineId) set.add(lineId);
    });
    return set;
  }, [pendingMoves, draggingUsers, previewColumns, user]);

  // lineId -> 操作中バッジ情報(自分の分を優先、なければ他ユーザーの分)
  const operatingByLine = useMemo(() => {
    const map = new Map<string, { userName: string; color: string; mine: boolean }>();
    for (const entry of pendingMoves) {
      if (entry.user.id === user?.id) continue;
      const badge = { userName: entry.user.name, color: entry.user.color, mine: false };
      map.set(entry.move.fromLineId, badge);
      map.set(entry.move.toLineId, badge);
    }
    if (user) {
      const badge = { userName: user.name, color: colorForUser(user.id), mine: true };
      for (const move of myPendingMoves) {
        map.set(move.fromLineId, badge);
        map.set(move.toLineId, badge);
      }
    }
    return map;
  }, [pendingMoves, myPendingMoves, user]);

  const totalPages = Math.max(1, Math.ceil(lines.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [page, totalPages]);

  const pagedLines = useMemo(
    () => lines.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [lines, page]
  );

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
    const sourceLineId = findContainer(previewColumns, id);
    if (sourceLineId && lockedLineIds.has(sourceLineId)) return;
    setActiveId(id);
    // 確定済みのyjsColumnsではなく、自分・他ユーザーの未確定操作を反映したpreviewColumnsを起点にする。
    // yjsColumnsを起点にすると、ドラッグ中は他の未確定操作のプレビューが一時的に消え、
    // ドラッグ終了時に突然復元されるように見えてしまう
    setDragColumns(previewColumns);
    provider?.awareness?.setLocalStateField('draggingPanelId', id);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    setDragColumns((prev) => (prev ? moveAcrossContainers(prev, active.id as string, over.id as string) : prev));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeIdValue = active.id as string;
    const base = dragColumns ?? yjsColumns;

    provider?.awareness?.setLocalStateField('draggingPanelId', null);

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

    // 移動元・移動先は「ドラッグ開始前(確定済み)の状態」を基準にする
    const fromLineId = findContainer(yjsColumns, activeIdValue);
    const toLineId = overContainer;
    if (!fromLineId) return;

    // dnd-kit側のdisabled判定をすり抜けて他ユーザーが編集中/操作中のラインへドロップしようとした場合の保険
    if (lockedLineIds.has(fromLineId) || lockedLineIds.has(toLineId)) return;

    const fromLineOrder = finalColumns[fromLineId] ?? [];
    const toLineOrder = finalColumns[toLineId] ?? [];
    const unchanged =
      fromLineId === toLineId &&
      toLineOrder.indexOf(activeIdValue) === (yjsColumns[fromLineId] ?? []).indexOf(activeIdValue);

    // 確定済み(ドラッグ開始前)の状態を基準に、この操作を既存の保留操作と置き換える(同一パネルにつき常に1件のみ保持)。
    // これにより、確定するまで何度動かしても表示される確認メッセージは1つのままで、履歴には最終的な移動結果だけが記録される
    setMyPendingMoves((prev) => {
      const withoutThisPanel = prev.filter((m) => m.panelId !== activeIdValue);
      // fromLineIdは常に確定済みの元のラインを指すため、このパネルが他の未確定操作の
      // fromLineOrder/toLineOrderに(直前のプレビュー上の位置として)残っている場合がある。
      // 反映し直さないと、そのラインにパネルが残存表示されたまま複製されてしまう
      const cleaned = withoutThisPanel.map((m) => ({
        ...m,
        fromLineOrder: m.fromLineOrder.filter((id) => id !== activeIdValue),
        toLineOrder: m.toLineOrder.filter((id) => id !== activeIdValue),
      }));
      const next = unchanged
        ? cleaned
        : [...cleaned, { panelId: activeIdValue, fromLineId, toLineId, fromLineOrder, toLineOrder }];
      provider?.awareness?.setLocalStateField('pendingMoves', next);
      return next;
    });
  }

  function handleDragCancel(_event: DragCancelEvent) {
    provider?.awareness?.setLocalStateField('draggingPanelId', null);
    resetDragState();
  }

  function resetDragState() {
    setDragColumns(null);
    setActiveId(null);
    lastOverId.current = null;
  }

  // 何ライン・何件の未確定操作を抱えていても、確定モーダルは常に1つだけ表示し、
  // 確定を押した時点で未確定操作をすべてまとめて確定する
  async function handleConfirmAll() {
    const moves = myPendingMoves;
    await Promise.all(moves.map((move) => commitMove(move.panelId, move.toLineId, applyPendingMove(yjsColumns, move))));
    setMyPendingMoves([]);
    provider?.awareness?.setLocalStateField('pendingMoves', []);
  }

  function handleCancelAll() {
    setMyPendingMoves([]);
    provider?.awareness?.setLocalStateField('pendingMoves', []);
  }

  function handleAddLine(e: FormEvent) {
    e.preventDefault();
    const name = newLineName.trim();
    if (!name) return;
    addLine(name);
    setNewLineName('');
    // 新規ラインは末尾に追加されるため、最終ページへ移動して表示する
    setPage(Math.ceil((lines.length + 1) / PAGE_SIZE) - 1);
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

      <div className="pagination">
        <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
          前のページ
        </button>
        <span>
          ページ {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
        >
          次のページ
        </button>
        <form className="board-add-line-form" onSubmit={handleAddLine}>
          <input
            type="text"
            placeholder="ラインを追加"
            value={newLineName}
            onChange={(e) => setNewLineName(e.target.value)}
          />
          <button type="submit">ライン追加</button>
        </form>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="lines">
          {pagedLines.map((line) => (
            <Line
              key={line.id}
              line={line}
              panelIds={columns[line.id] ?? []}
              panelsById={panelsById}
              draggingUsers={draggingUsers}
              operating={operatingByLine.get(line.id)}
              dragLocked={lockedLineIds.has(line.id)}
              onDelete={removePanel}
              onAdd={addPanel}
            />
          ))}
        </div>

        <DragOverlay>{activePanel ? <PanelOverlay panel={activePanel} /> : null}</DragOverlay>
      </DndContext>

      {myPendingMoves.length > 0 && (
        <div className="confirm-bar-stack">
          <div className="confirm-bar">
            <span>操作を確定しますか?</span>
            <button type="button" className="confirm-bar-confirm" onClick={handleConfirmAll}>
              確定
            </button>
            <button type="button" className="confirm-bar-cancel" onClick={handleCancelAll}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
