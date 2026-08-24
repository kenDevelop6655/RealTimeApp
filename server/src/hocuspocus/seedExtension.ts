import type { Extension } from '@hocuspocus/server';

interface DefaultLine {
  id: string;
  name: string;
  order: number;
}

const DEFAULT_LINES: DefaultLine[] = [
  { id: 'unassigned', name: '未アサイン', order: 0 },
  { id: 'team-a', name: 'チームA', order: 1 },
  { id: 'team-b', name: 'チームB', order: 2 },
];

// 空のドキュメント(初回起動)にだけデフォルトのラインを1回投入する
export const seedExtension: Extension = {
  onLoadDocument: async ({ document }) => {
    const lines = document.getMap('lines');
    if (lines.size === 0) {
      document.transact(() => {
        for (const line of DEFAULT_LINES) {
          lines.set(line.id, line);
        }
      });
    }
  },
};
