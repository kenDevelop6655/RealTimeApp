import type { AuthResponse, LoginRequest, SignupRequest } from '@realtimeapp/shared';
import { apiFetch } from './client';

export function signup(body: SignupRequest) {
  return apiFetch<AuthResponse>('/signup', { method: 'POST', body });
}

export function login(body: LoginRequest) {
  return apiFetch<AuthResponse>('/login', { method: 'POST', body });
}
