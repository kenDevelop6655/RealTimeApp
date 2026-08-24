import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password';

const prisma = new PrismaClient();

const SEED_USERS = [
  { name: 'ユーザー1', email: 'user1@example.com', password: 'password123' },
  { name: 'ユーザー2', email: 'user2@example.com', password: 'password123' },
];

async function main() {
  for (const { name, email, password } of SEED_USERS) {
    const passwordHash = await hashPassword(password);
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, passwordHash },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
