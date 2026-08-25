import type {
  CreateHistoryConfirmationRequest,
  CreateHistoryRequest,
  HistoryConfirmationDto,
  HistoryEntryDto,
} from '@realtimeapp/shared';
import { apiFetch } from './client';

export function recordHistory(token: string, body: CreateHistoryRequest) {
  return apiFetch<HistoryEntryDto>('/history', { method: 'POST', body, token });
}

export function fetchHistory(token: string) {
  return apiFetch<HistoryEntryDto[]>('/history', { token });
}

export function createHistoryConfirmation(token: string, body: CreateHistoryConfirmationRequest = {}) {
  return apiFetch<HistoryConfirmationDto>('/history/confirmations', { method: 'POST', body, token });
}
