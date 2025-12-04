'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePeerService } from '@/lib/usePeerService';

type RaceState = 'IDLE' | 'ARMED' | 'RUNNING' | 'FINISHED';

interface HostViewProps {
  onBack: () => void;
  myId: string;
}

export default function HostView({ onBack, myId }: HostViewProps) {
  const peerService = usePeerService();
  const [raceState, setRaceState] = useState<RaceState>('IDLE');
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  const formattedTime = `${Math.floor(elapsedTime / 1000)}.${Math.floor((elapsedTime % 1000) / 10).toString().padStart(2, '0')}`;

  const canStart = peerService.peers.some(p => p.role === 'START');

  useEffect(() => {
    // Initialize peer service as host when component mounts
    const initializeHost = async () => {
      try {
        await peerService.init(true);
      } catch (error) {
        console.error('Failed to initialize host:', error);
      }
    };

    initializeHost();

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      peerService.destroy();
    };
  }, [peerService, timerInterval]);

  useEffect(() => {
    const msg = peerService.latestMessage;
    if (!msg) return;

    if (msg.type === 'TRIGGER') {
      handleTrigger(msg.payload.role, msg.payload.timestamp);
    }
  }, [peerService.latestMessage, handleTrigger]);

  const startTimer = useCallback(() => {
    setRaceState('RUNNING');
    const now = Date.now();
    setStartTime(now);

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - now);
    }, 10);

    setTimerInterval(interval);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [timerInterval]);

  const handleTrigger = useCallback((role: 'START' | 'FINISH', remoteTimestamp: number) => {
    if (raceState === 'ARMED' && role === 'START') {
      startTimer();
    } else if (raceState === 'RUNNING' && role === 'FINISH') {
      stopTimer();
      setRaceState('FINISHED');
      peerService.broadcastState('LOBBY');
      setElapsedTime(Date.now() - startTime);
    }
  }, [raceState, startTimer, stopTimer, startTime, peerService]);

  const setRole = useCallback((peerId: string, role: 'START' | 'FINISH') => {
    // Clear role from other peers if they had it
    const currentPeers = peerService.peers;
    currentPeers.forEach(p => {
      if (p.role === role && p.id !== peerId) {
        peerService.assignRole(p.id, 'NONE');
      }
    });

    peerService.assignRole(peerId, role);
  }, [peerService]);

  const armSystem = useCallback(() => {
    setRaceState('ARMED');
    setElapsedTime(0);
    peerService.broadcastState('ARMED');
  }, [peerService]);

  const cancelRace = useCallback(() => {
    stopTimer();
    setRaceState('IDLE');
    peerService.broadcastState('LOBBY');
    setElapsedTime(0);
  }, [stopTimer, peerService]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Navbar */}
      <div className="p-4 bg-slate-800 flex justify-between items-center shadow-md">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Session Code</span>
          <h1 className="font-mono font-bold text-3xl text-blue-400 tracking-widest">{myId}</h1>
        </div>
        <div className="px-3 py-1 bg-slate-700 rounded text-sm font-mono">
          Peers: {peerService.peers.length}
        </div>
      </div>

      {/* Timer Section */}
      <div className="flex-grow flex flex-col items-center justify-center p-6 space-y-8">

        {/* Main Clock */}
        <div className="text-center">
          <div className="text-9xl font-mono font-bold tracking-tighter tabular-nums text-white drop-shadow-lg">
            {formattedTime}
          </div>
          <div className="text-slate-400 uppercase tracking-widest mt-2 font-semibold">
            {raceState}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          {(raceState === 'IDLE' || raceState === 'FINISHED') && (
            <button
              onClick={armSystem}
              disabled={!canStart}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              Arm System
            </button>
          )}
          
          {raceState === 'ARMED' && (
            <button
              onClick={cancelRace}
              className="px-8 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          
          {raceState === 'RUNNING' && (
            <button
              onClick={cancelRace}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              Stop Race
            </button>
          )}
        </div>
      </div>

      {/* Peer Management */}
      <div className="bg-slate-800 p-4 border-t border-slate-700">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {peerService.peers.map((peer) => (
            <div
              key={peer.id}
              className={`p-3 rounded-lg text-center ${
                peer.role === 'START' ? 'bg-green-700' :
                peer.role === 'FINISH' ? 'bg-blue-700' :
                'bg-slate-600'
              }`}
            >
              <div className="text-sm font-mono text-slate-300">{peer.id}</div>
              <div className="text-xs text-slate-400">{peer.role}</div>
            </div>
          ))}
        </div>
        
        {peerService.peers.length > 0 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => {
                const firstUnassigned = peerService.peers.find(p => p.role === 'NONE');
                if (firstUnassigned) {
                  setRole(firstUnassigned.id, 'START');
                }
              }}
              disabled={!peerService.peers.some(p => p.role === 'NONE')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              Set Start
            </button>
            
            <button
              onClick={() => {
                const firstUnassigned = peerService.peers.find(p => p.role === 'NONE');
                if (firstUnassigned) {
                  setRole(firstUnassigned.id, 'FINISH');
                }
              }}
              disabled={!peerService.peers.some(p => p.role === 'NONE')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              Set Finish
            </button>
            
            <button
              onClick={() => {
                peerService.broadcastReset();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              Reset All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
              className="px-8 py-4 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl font-bold text-xl transition shadow-lg shadow-green-900/50"
            >
              ARM SYSTEM
            </button>
          )}
          {raceState === 'ARMED' && (
            <button
              onClick={cancelRace}
              className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-bold text-xl text-white transition animate-pulse"
            >
              CANCEL / DISARM
            </button>
          )}
          {raceState === 'RUNNING' && (
            <button
              onClick={cancelRace}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-xl transition"
            >
              STOP
            </button>
          )}
        </div>
      </div>

      {/* Peer Management (Bottom Sheet style) */}
      <div className="bg-slate-800 p-6 rounded-t-3xl shadow-negative" style={{ boxShadow: '0 -4px 20px -5px rgba(0,0,0,0.3)' }}>
        <h3 className="text-gray-400 font-bold mb-4 uppercase text-xs tracking-wider">Connected Gates</h3>

        <div className="space-y-3">
          {peerService.peers.length > 0 ? (
            peerService.peers.map((peer) => (
              <div key={peer.id} className="flex items-center justify-between bg-slate-700 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${peer.conn.open ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <div>
                    <div className="font-bold">{peer.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{peer.id}</div>
                  </div>
                </div>

                {/* Role Selector */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setRole(peer.id, 'START')}
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      peer.role === 'START' ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
                  >
                    START
                  </button>
                  <button
                    onClick={() => setRole(peer.id, 'FINISH')}
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      peer.role === 'FINISH' ? 'bg-purple-600' : 'bg-slate-600'
                    }`}
                  >
                    FINISH
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4 italic">
              Waiting for devices to join...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}