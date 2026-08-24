import { Server } from '@hocuspocus/server';
import { YJS_DOCUMENT_NAME } from '@realtimeapp/shared';
import { verifyToken } from '../auth/jwt';
import { databaseExtension } from './persistence';
import { seedExtension } from './seedExtension';

export const hocuspocusServer = Server.configure({
  debounce: 2000,
  maxDebounce: 10000,
  extensions: [databaseExtension, seedExtension],
  onAuthenticate: async ({ token, documentName }) => {
    if (documentName !== YJS_DOCUMENT_NAME) {
      throw new Error('unknown document');
    }
    if (!token) {
      throw new Error('authentication required');
    }

    const payload = verifyToken(token);
    return {
      user: { id: payload.sub, name: payload.name },
    };
  },
});
