export type ActionType = 'add' | 'remove' | 'move';

export interface LineDto {
  id: string;
  name: string;
  order: number;
}

export interface PanelDto {
  id: string;
  name: string;
  lineId: string;
  order: number;
  createdAt: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface JwtPayload {
  sub: string;
  name: string;
  email: string;
}

export interface CreateHistoryRequest {
  panelId: string;
  panelName: string;
  action: ActionType;
  fromLineId?: string | null;
  toLineId?: string | null;
  fromIndex?: number | null;
  toIndex?: number | null;
}

export interface HistoryEntryDto {
  id: string;
  userId: string;
  userName: string;
  panelId: string;
  panelName: string;
  action: ActionType;
  fromLineId: string | null;
  toLineId: string | null;
  fromIndex: number | null;
  toIndex: number | null;
  createdAt: string;
}

export interface AwarenessUser {
  id: string;
  name: string;
  color: string;
}

// ドロップ後・確定前の「操作中」状態。Y.Docは変更せずAwarenessのみで共有する
export interface PendingMove {
  panelId: string;
  fromLineId: string;
  toLineId: string;
  fromLineOrder: string[];
  toLineOrder: string[];
}

export interface AwarenessState {
  user: AwarenessUser;
  draggingPanelId?: string | null;
  pendingMoves?: PendingMove[];
}

// 単一の共有スペース(ボード概念なし)を表す固定のYjsドキュメント名
export const YJS_DOCUMENT_NAME = 'realtimeapp-space';
