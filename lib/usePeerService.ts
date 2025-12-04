import { useState, useEffect, useCallback } from 'react';
import { Peer } from 'peerjs';

export interface PeerData {
  type: 'JOIN' | 'ROLE_ASSIGN' | 'STATE_CHANGE' | 'TRIGGER' | 'RESET';
  payload?: any;
}

export interface ConnectedPeer {
  id: string;
  conn: any;
  role: 'NONE' | 'START' | 'FINISH';
  name?: string;
}

export const usePeerService = () => {
  const [peer, setPeer] = useState<any>(null);
  const [myId, setMyId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [peers, setPeers] = useState<ConnectedPeer[]>([]);
  const [hostConnection, setHostConnection] = useState<any>(null);
  const [latestMessage, setLatestMessage] = useState<PeerData | null>(null);

  const generateShortId = useCallback((): string => {
    // Generate a 4-digit numerical string (1000-9999)
    return Math.floor(1000 + Math.random() * 9000).toString();
  }, []);

  const init = useCallback(async (isHostMode: boolean, id?: string): Promise<string> => {
    setIsHost(isHostMode);
    setConnectionStatus('Initializing Peer...');

    return new Promise((resolve, reject) => {
      // Create random ID for simplicity if host, or use requested ID
      const peerId = id || (isHostMode ? generateShortId() : undefined);

    const newPeer = peerId ? new Peer(peerId, { debug: 1 }) : new Peer({ debug: 1 });

      newPeer.on('open', (id: string) => {
        setMyId(id);
        setIsConnected(true);
        setConnectionStatus('Online');
        console.log('My Peer ID is:', id);
        setPeer(newPeer);
        resolve(id);
      });

      newPeer.on('connection', (conn: any) => {
        handleIncomingConnection(conn, isHostMode);
      });

      newPeer.on('error', (err: any) => {
        console.error('Peer error', err);
        setConnectionStatus('Error: ' + err.type);
        reject(err);
      });
    });
  }, [generateShortId]);

  const handleIncomingConnection = useCallback((conn: any, isHostMode: boolean) => {
    if (isHostMode) {
      conn.on('open', () => {
        // Add to peers list temporarily, wait for handshake
        setPeers(prev => [...prev, { id: conn.peer, conn, role: 'NONE', name: 'Unknown' }]);
      });

      conn.on('data', (data: any) => {
        if (data.type === 'JOIN') {
          setPeers(prev => prev.map(p =>
            p.id === conn.peer ? { ...p, name: data.payload.name } : p
          ));
        } else {
          handleMessage(data, conn.peer);
        }
      });

      conn.on('close', () => {
        setPeers(prev => prev.filter(p => p.id !== conn.peer));
      });
    }
  }, []);

  const connectToHost = useCallback((hostId: string, deviceName: string) => {
    if (!peer) return;

    setConnectionStatus('Connecting to Host...');
    const conn = peer.connect(hostId);

    conn.on('open', () => {
      setConnectionStatus('Connected to Host');
      setHostConnection(conn);

      // Send handshake
      sendToHost({ type: 'JOIN', payload: { name: deviceName } });

      conn.on('data', (data: any) => {
        handleMessage(data, conn.peer);
      });
    });

    conn.on('close', () => {
      setConnectionStatus('Disconnected from Host');
      setHostConnection(null);
    });

    conn.on('error', (err: any) => {
      console.error('Connection error', err);
      setConnectionStatus('Connection Error');
    });
  }, [peer]);

  const assignRole = useCallback((peerId: string, role: 'START' | 'FINISH' | 'NONE') => {
    // Update local state
    setPeers(prev => prev.map(p => {
      if (p.id === peerId) return { ...p, role };
      return p;
    }));

    // Notify peer
    const peer = peers.find(p => p.id === peerId);
    if (peer) {
      peer.conn.send({ type: 'ROLE_ASSIGN', payload: { role } });
    }
  }, [peers]);

  const broadcastState = useCallback((state: string) => {
    peers.forEach(p => {
      p.conn.send({ type: 'STATE_CHANGE', payload: { state } });
    });
  }, [peers]);

  const sendReset = useCallback(() => {
    peers.forEach(p => {
      p.conn.send({ type: 'RESET' });
    });
  }, [peers]);

  const sendToHost = useCallback((data: PeerData) => {
    const conn = hostConnection;
    if (conn) {
      conn.send(data);
    }
  }, [hostConnection]);

  const sendTrigger = useCallback((role: 'START' | 'FINISH', timestamp: number) => {
    const conn = hostConnection;
    if (conn) {
      conn.send({ type: 'TRIGGER', payload: { role, timestamp } });
    }
  }, [hostConnection]);

  const handleMessage = useCallback((data: PeerData, senderId: string) => {
    console.log('Received:', data, 'from', senderId);
    setLatestMessage({ ...data }); // Trigger state update
  }, []);

  const destroy = useCallback(() => {
    if (peer) {
      peer.destroy();
      setPeer(null);
      setIsConnected(false);
      setConnectionStatus('Disconnected');
      setPeers([]);
      setHostConnection(null);
    }
  }, [peer]);

  return {
    // State
    myId,
    isHost,
    isConnected,
    connectionStatus,
    peers,
    latestMessage,

    // Methods
    init,
    connectToHost,
    assignRole,
    broadcastState,
    sendReset,
    sendTrigger,
    destroy
  };
};