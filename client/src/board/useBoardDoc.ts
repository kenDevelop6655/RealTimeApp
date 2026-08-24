import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { YJS_DOCUMENT_NAME, type LineDto, type PanelDto } from '@realtimeapp/shared';

const WS_URL = import.meta.env.VITE_WS_URL;

export interface BoardDoc {
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  connected: boolean;
  lines: LineDto[];
  panels: PanelDto[];
}

function readPanel(panelYMap: Y.Map<unknown>): PanelDto {
  return {
    id: panelYMap.get('id') as string,
    name: panelYMap.get('name') as string,
    lineId: panelYMap.get('lineId') as string,
    order: panelYMap.get('order') as number,
    createdAt: panelYMap.get('createdAt') as number,
  };
}

export function useBoardDoc(token: string | null): BoardDoc {
  const ydocRef = useRef<Y.Doc>();
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }
  const ydoc = ydocRef.current;

  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [connected, setConnected] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!token) return;

    const nextProvider = new HocuspocusProvider({
      url: WS_URL,
      name: YJS_DOCUMENT_NAME,
      document: ydoc,
      token,
      onStatus: ({ status }) => setConnected(status === 'connected'),
    });
    setProvider(nextProvider);

    const linesMap = ydoc.getMap('lines');
    const panelsMap = ydoc.getMap('panels');
    const bump = () => setVersion((v) => v + 1);
    linesMap.observe(bump);
    panelsMap.observeDeep(bump);

    return () => {
      linesMap.unobserve(bump);
      panelsMap.unobserveDeep(bump);
      nextProvider.destroy();
      setProvider(null);
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const lines = useMemo(() => {
    const map = ydoc.getMap<LineDto>('lines');
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ydoc, version]);

  const panels = useMemo(() => {
    const map = ydoc.getMap<Y.Map<unknown>>('panels');
    return Array.from(map.values()).map(readPanel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ydoc, version]);

  return { ydoc, provider, connected, lines, panels };
}
