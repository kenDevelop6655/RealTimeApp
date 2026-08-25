import { Router } from 'express';
import type {
  CreateHistoryConfirmationRequest,
  CreateHistoryRequest,
  HistoryConfirmationDto,
  HistoryEntryDto,
} from '@realtimeapp/shared';
import { prisma } from '../db/prisma';
import { authenticate, type AuthedRequest } from '../middleware/authenticate';

export const historyRouter = Router();

historyRouter.use(authenticate);

const ACTIONS = new Set(['add', 'remove', 'move']);

// 複数の操作(追加/削除/移動)を一度に確定する際、それらのHistory行を束ねるHistoryConfirmationを1件作成する。
// クライアントは確定操作の開始時にこのIDを取得し、各History作成リクエストに含める。
historyRouter.post('/confirmations', async (req: AuthedRequest, res) => {
  const body = req.body as CreateHistoryConfirmationRequest;
  const comment = body.comment?.trim();

  const confirmation = await prisma.historyConfirmation.create({
    data: { confirmedById: req.user!.sub, comment: comment ? comment : null },
    include: { confirmedBy: true },
  });

  res.status(201).json(toConfirmationDto(confirmation));
});

historyRouter.post('/', async (req: AuthedRequest, res) => {
  const body = req.body as CreateHistoryRequest;

  if (!body.panelId || !body.panelName || !ACTIONS.has(body.action)) {
    res.status(400).json({ error: 'panelId, panelName, action は必須です' });
    return;
  }

  if (body.confirmationId) {
    const confirmation = await prisma.historyConfirmation.findUnique({ where: { id: body.confirmationId } });
    if (!confirmation) {
      res.status(400).json({ error: '指定されたconfirmationIdが存在しません' });
      return;
    }
  }

  const entry = await prisma.history.create({
    data: {
      userId: req.user!.sub,
      panelId: body.panelId,
      panelName: body.panelName,
      action: body.action,
      fromLineId: body.fromLineId ?? null,
      toLineId: body.toLineId ?? null,
      fromIndex: body.fromIndex ?? null,
      toIndex: body.toIndex ?? null,
      confirmationId: body.confirmationId ?? null,
    },
    include: { user: true },
  });

  res.status(201).json(toDto(entry));
});

historyRouter.get('/', async (_req, res) => {
  const entries = await prisma.history.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: true },
  });

  res.json(entries.map(toDto));
});

function toDto(entry: {
  id: string;
  userId: string;
  user: { name: string };
  panelId: string;
  panelName: string;
  action: string;
  fromLineId: string | null;
  toLineId: string | null;
  fromIndex: number | null;
  toIndex: number | null;
  createdAt: Date;
  confirmationId: string | null;
}): HistoryEntryDto {
  return {
    id: entry.id,
    userId: entry.userId,
    userName: entry.user.name,
    panelId: entry.panelId,
    panelName: entry.panelName,
    action: entry.action as HistoryEntryDto['action'],
    fromLineId: entry.fromLineId,
    toLineId: entry.toLineId,
    fromIndex: entry.fromIndex,
    toIndex: entry.toIndex,
    createdAt: entry.createdAt.toISOString(),
    confirmationId: entry.confirmationId,
  };
}

function toConfirmationDto(confirmation: {
  id: string;
  confirmedById: string;
  confirmedBy: { name: string };
  confirmedAt: Date;
  comment: string | null;
}): HistoryConfirmationDto {
  return {
    id: confirmation.id,
    confirmedById: confirmation.confirmedById,
    confirmedByName: confirmation.confirmedBy.name,
    confirmedAt: confirmation.confirmedAt.toISOString(),
    comment: confirmation.comment,
  };
}
