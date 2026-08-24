import { Database } from '@hocuspocus/extension-database';
import { prisma } from '../db/prisma';

const SNAPSHOT_ID = 'main';

export const databaseExtension = new Database({
  fetch: async () => {
    const snapshot = await prisma.docSnapshot.findUnique({ where: { id: SNAPSHOT_ID } });
    return snapshot ? new Uint8Array(snapshot.ydocState) : null;
  },
  store: async ({ state }) => {
    await prisma.docSnapshot.upsert({
      where: { id: SNAPSHOT_ID },
      create: { id: SNAPSHOT_ID, ydocState: Buffer.from(state) },
      update: { ydocState: Buffer.from(state) },
    });
  },
});
