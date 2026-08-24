import { Router } from 'express';
import type { CreateHistoryRequest, HistoryEntryDto } from '@realtimeapp/shared';
import { prisma } from '../db/prisma';
import { authenticate, type AuthedRequest } from '../middleware/authenticate';

export const historyRouter = Router();

historyRouter.use(authenticate);

const ACTIONS = new Set(['add', 'remove', 'move']);

historyRouter.post('/', async (req: AuthedRequest, res) => {
  const body = req.body as CreateHistoryRequest;

  if (!body.panelId || !body.panelName || !ACTIONS.has(body.action)) {
    res.status(400).json({ error: 'panelId, panelName, action は必須です' });
    return;
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
  };
}
