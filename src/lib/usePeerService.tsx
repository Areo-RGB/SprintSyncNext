'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { Peer } from 'peerjs';
import {
  MessageType,
  PeerJSInstance,
  PeerJSDataConnection,
  PeerJSError,
  GateRole
} from '@/types';

export interface PeerData {
  type: MessageType;
  payload?: {
    name?: string;
    role?: GateRole | 'NONE';
    state?: string;
    timestamp?: number;
    raceId?: string;
  };
}

export interface ConnectedPeer {
  id: string;
  conn: PeerJSDataConnection;
  role: GateRole | 'NONE';
  name?: string;
}

interface PeerContextValue {
  // State
  myId: string;
  isHost: boolean;
  isConnected: boolean;
  connectionStatus: string;
  peers: ConnectedPeer[];
  latestMessage: PeerData | null;
  triggerEvents: { role: GateRole, timestamp: number | undefined }[];

  // Methods
  init: (isHostMode: boolean, id?: string) => Promise<string>;
  connectToHost: (hostId: string, deviceName: string) => void;
  assignRole: (peerId: string, role: GateRole | 'NONE') => void;
  broadcastState: (state: string, raceId?: string) => void;
  sendReset: () => void;
  broadcastReset: () => void;
  sendTrigger: (role: GateRole, timestamp: number, raceId?: string) => void;
  clearTriggerEvents: () => void;
  destroy: () => void;
}

const PeerContext = createContext<PeerContextValue | null>(null);

export function PeerProvider({ children }: { children: ReactNode }) {
  const peerRef = useRef<PeerJSInstance | null>(null);
  const hostConnectionRef = useRef<PeerJSDataConnection | null>(null);
  const peersRef = useRef<ConnectedPeer[]>([]);
  const isHostRef = useRef<boolean>(false);
  const isConnectedRef = useRef<boolean>(false);

  const [myId, setMyId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [peers, setPeers] = useState<ConnectedPeer[]>([]);
  const [latestMessage, setLatestMessage] = useState<PeerData | null>(null);
  const [triggerEvents, setTriggerEvents] = useState<{ role: GateRole, timestamp: number | undefined }[]>([]);

  const generateShortId = useCallback((): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }, []);

  const handleMessage = useCallback((data: PeerData, senderId: string) => {
    console.log('Received:', data, 'from', senderId);
    setLatestMessage({ ...data });

    if (data.type === MessageType.TRIGGER && data.payload?.role && data.payload?.timestamp) {
      setTriggerEvents(prev => [...prev, { role: data.payload!.role as GateRole, timestamp: data.payload!.timestamp }]);
    }
  }, []);

  const sendToHostInternal = useCallback((data: PeerData) => {
    const conn = hostConnectionRef.current;
    if (conn) {
      conn.send(data);
    }
  }, []);

  const handleIncomingConnection = useCallback((conn: PeerJSDataConnection, isHostMode: boolean) => {
    if (isHostMode) {
      conn.on('open', () => {
        const newPeer = { id: conn.peer, conn, role: 'NONE' as const, name: 'Unknown' };
        peersRef.current = [...peersRef.current, newPeer];
        setPeers([...peersRef.current]);
      });

      conn.on('data', (data: unknown) => {
        const peerData = data as PeerData;
        if (peerData.type === MessageType.JOIN) {
          peersRef.current = peersRef.current.map(p =>
            p.id === conn.peer ? { ...p, ...(peerData.payload?.name ? { name: peerData.payload.name } : {}) } : p
          );
          setPeers([...peersRef.current]);
        } else {
          handleMessage(peerData, conn.peer);
        }
      });

      conn.on('close', () => {
        peersRef.current = peersRef.current.filter(p => p.id !== conn.peer);
        setPeers([...peersRef.current]);
        console.log(`Peer ${conn.peer} disconnected`);
      });

      conn.on('error', (err: PeerJSError) => {
        console.error(`Connection error with peer ${conn.peer}:`, err);
        peersRef.current = peersRef.current.filter(p => p.id !== conn.peer);
        setPeers([...peersRef.current]);
      });
    }
  }, [handleMessage]);

  const init = useCallback(async (isHostMode: boolean, id?: string): Promise<string> => {
    // If already initialized with same mode, return existing ID
    if (peerRef.current && isHostRef.current === isHostMode && isConnectedRef.current) {
      console.log('Peer already initialized, reusing existing connection');
      return myId;
    }

    // If switching modes or reinitializing, destroy existing
    if (peerRef.current) {
      console.log('Destroying existing peer before reinitializing');
      peerRef.current.destroy();
      peerRef.current = null;
    }

    isHostRef.current = isHostMode;
    setIsHost(isHostMode);
    setConnectionStatus('Initializing Peer...');

    return new Promise((resolve, reject) => {
      const peerId = id || (isHostMode ? generateShortId() : undefined);
      const newPeer = peerId ? new Peer(peerId, { debug: 1 }) : new Peer({ debug: 1 });

      newPeer.on('open', (openedId: string) => {
        setMyId(openedId);
        setIsConnected(true);
        isConnectedRef.current = true;
        setConnectionStatus('Online');
        console.log('My Peer ID is:', openedId);
        peerRef.current = newPeer as unknown as PeerJSInstance;
        resolve(openedId);
      });

      newPeer.on('connection', (conn: PeerJSDataConnection) => {
        handleIncomingConnection(conn, isHostMode);
      });

      newPeer.on('disconnected', () => {
        console.log('Peer disconnected from server');
        setIsConnected(false);
        isConnectedRef.current = false;
        setConnectionStatus('Disconnected');

        // Try to reconnect
        if (peerRef.current) {
          console.log('Attempting to reconnect to server...');
          try {
            (peerRef.current as any).reconnect();
          } catch (e) {
            console.warn('Reconnect failed:', e);
          }
        }
      });

      newPeer.on('close', () => {
        console.log('Peer connection closed');
        setIsConnected(false);
        isConnectedRef.current = false;
        setConnectionStatus('Connection closed');
      });

      newPeer.on('error', (err: PeerJSError) => {
        console.error('Peer error', err);
        setConnectionStatus('Error: ' + err.type);

        if (err.type === 'unavailable-id') {
          // ID taken, generate new one
          const newId = generateShortId();
          console.log('ID unavailable, trying new ID:', newId);
          init(isHostMode, newId).then(resolve).catch(reject);
        } else if (err.type === 'server-error' || err.type === 'network') {
          setTimeout(() => {
            if (!isConnectedRef.current) {
              console.log('Attempting to reconnect...');
              init(isHostMode, id).catch(reject);
            }
          }, 3000);
        } else {
          reject(err);
        }
      });
    });
  }, [generateShortId, handleIncomingConnection, myId]);

  const connectToHost = useCallback((hostId: string, deviceName: string) => {
    if (!peerRef.current) return;

    setConnectionStatus('Connecting to Host...');
    const conn = peerRef.current.connect(hostId);

    conn.on('open', () => {
      setConnectionStatus('Connected to Host');
      hostConnectionRef.current = conn;

      // Send handshake using internal function
      sendToHostInternal({ type: MessageType.JOIN, payload: { name: deviceName } });

      conn.on('data', (data: unknown) => {
        const peerData = data as PeerData;
        handleMessage(peerData, conn.peer);
      });
    });

    conn.on('close', () => {
      setConnectionStatus('Disconnected from Host');
      hostConnectionRef.current = null;

      setTimeout(() => {
        if (!hostConnectionRef.current && peerRef.current) {
          console.log('Attempting to reconnect to host...');
          connectToHost(hostId, deviceName);
        }
      }, 3000);
    });

    conn.on('error', (err: PeerJSError) => {
      console.error('Connection error', err);
      setConnectionStatus('Connection Error');

      if (err.type === 'peer-unavailable' || err.type === 'network') {
        setTimeout(() => {
          if (!hostConnectionRef.current && peerRef.current) {
            console.log('Attempting to reconnect to host...');
            connectToHost(hostId, deviceName);
          }
        }, 3000);
      }
    });
  }, [handleMessage]);

  const assignRole = useCallback((peerId: string, role: GateRole | 'NONE') => {
    peersRef.current = peersRef.current.map(p => {
      if (p.id === peerId) return { ...p, role };
      return p;
    });
    setPeers([...peersRef.current]);

    const peer = peersRef.current.find(p => p.id === peerId);
    if (peer) {
      peer.conn.send({ type: MessageType.ROLE_ASSIGN, payload: { role } });
    }
  }, []);

  const broadcastState = useCallback((state: string, raceId?: string) => {
    peersRef.current.forEach(p => {
      p.conn.send({
        type: MessageType.STATE_CHANGE,
        payload: { state, raceId }
      });
    });
  }, []);

  const sendReset = useCallback(() => {
    peersRef.current.forEach(p => {
      p.conn.send({ type: MessageType.RESET });
    });
  }, []);

  const broadcastReset = useCallback(() => {
    sendReset();
    setTriggerEvents([]);
  }, [sendReset]);

  const sendTrigger = useCallback((role: GateRole, timestamp: number, raceId?: string) => {
    const conn = hostConnectionRef.current;
    if (conn) {
      conn.send({
        type: MessageType.TRIGGER,
        payload: { role, timestamp, raceId }
      });
    }
  }, []);

  const clearTriggerEvents = useCallback(() => {
    setTriggerEvents([]);
  }, []);

  const destroy = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
      hostConnectionRef.current = null;
      peersRef.current = [];
      isConnectedRef.current = false;
      setIsConnected(false);
      setConnectionStatus('Disconnected');
      setPeers([]);
      setTriggerEvents([]);
    }
  }, []);

  const value: PeerContextValue = {
    myId,
    isHost,
    isConnected,
    connectionStatus,
    peers,
    latestMessage,
    triggerEvents,
    init,
    connectToHost,
    assignRole,
    broadcastState,
    sendReset,
    broadcastReset,
    sendTrigger,
    clearTriggerEvents,
    destroy
  };

  return (
    <PeerContext.Provider value={value}>
      {children}
    </PeerContext.Provider>
  );
}

export function usePeerService(): PeerContextValue {
  const context = useContext(PeerContext);
  if (!context) {
    throw new Error('usePeerService must be used within a PeerProvider');
  }
  return context;
}