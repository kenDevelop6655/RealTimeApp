import { Router } from 'express';
import type { AuthResponse, LoginRequest, SignupRequest } from '@realtimeapp/shared';
import { prisma } from '../db/prisma';
import { hashPassword, comparePassword } from '../auth/password';
import { signToken } from '../auth/jwt';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const { email, password, name } = req.body as SignupRequest;

  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password, name は必須です' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'パスワードは8文字以上にしてください' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'このメールアドレスは既に登録されています' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });

  const token = signToken({ sub: user.id, name: user.name, email: user.email });
  const response: AuthResponse = {
    token,
    user: { id: user.id, name: user.name, email: user.email },
  };
  res.status(201).json(response);
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    res.status(400).json({ error: 'email, password は必須です' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });
    return;
  }

  const token = signToken({ sub: user.id, name: user.name, email: user.email });
  const response: AuthResponse = {
    token,
    user: { id: user.id, name: user.name, email: user.email },
  };
  res.json(response);
});
