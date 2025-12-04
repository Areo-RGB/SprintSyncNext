'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePeerService } from '@/lib/usePeerService';
import { useSupabaseService } from '@/lib/useSupabaseService';
import { GateRole } from '@/types';

type RaceState = 'IDLE' | 'ARMED' | 'RUNNING' | 'FINISHED';

interface HostViewProps {
  onBack: () => void;
  myId: string;
}

export default function HostView({ onBack, myId }: HostViewProps) {
  const peerService = usePeerService();
  const supabaseService = useSupabaseService(myId);

  const [raceState, setRaceState] = useState<RaceState>('IDLE');
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [isCorrectingTime, setIsCorrectingTime] = useState(false);
  const [preciseTime, setPreciseTime] = useState<number | null>(null);
  const [splitTimes, setSplitTimes] = useState<{ [key: string]: number }>({});

  const formattedTime = preciseTime !== null
    ? `${Math.floor(preciseTime / 1000)}.${Math.floor((preciseTime % 1000) / 10).toString().padStart(2, '0')}`
    : `${Math.floor(elapsedTime / 1000)}.${Math.floor((elapsedTime % 1000) / 10).toString().padStart(2, '0')}`;

  const canStart = peerService.peers.some(p => p.role === GateRole.START);

  useEffect(() => {
    // Create a new race in Supabase when host view mounts
    const initializeRace = async () => {
      try {
        await supabaseService.createRace(myId);
      } catch (error) {
        console.error('Failed to create race:', error);
      }
    };

    initializeRace();

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      // Note: PeerService lifecycle is managed by PeerProvider context
    };
  }, [myId, supabaseService, timerInterval]);

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

  const handleTrigger = useCallback(async (role: GateRole, _remoteTimestamp: number | undefined) => {
    if (raceState === 'ARMED' && role === GateRole.START) {
      startTimer();
      // Update race status in Supabase
      await supabaseService.updateRaceStatus('racing', new Date());
    } else if (raceState === 'RUNNING' && role === GateRole.SPLIT) {
      // Record split time
      const splitTime = Date.now() - startTime;
      setSplitTimes(prev => ({ ...prev, [Date.now().toString()]: splitTime }));
      // Optional: Broadcast split time to peers if needed
    } else if (raceState === 'RUNNING' && role === GateRole.FINISH) {
      stopTimer();
      setRaceState('FINISHED');
      peerService.broadcastState('LOBBY');
      setElapsedTime(Date.now() - startTime);

      // Update race status in Supabase
      await supabaseService.updateRaceStatus('finished', undefined, new Date());
    }
  }, [raceState, startTimer, stopTimer, startTime, peerService, supabaseService]);

  const setRole = useCallback((peerId: string, role: GateRole | 'NONE') => {
    // Clear role from other peers if they had it
    const currentPeers = peerService.peers;
    currentPeers.forEach(p => {
      if (p.role === role && p.id !== peerId) {
        peerService.assignRole(p.id, 'NONE');
      }
    });

    peerService.assignRole(peerId, role);
  }, [peerService]);

  const armSystem = useCallback(async () => {
    setRaceState('ARMED');
    setElapsedTime(0);
    setPreciseTime(null);
    peerService.broadcastState('ARMED', supabaseService.currentRace?.id);

    // Update race status in Supabase
    await supabaseService.updateRaceStatus('armed');
  }, [peerService, supabaseService]);

  const cancelRace = useCallback(async () => {
    stopTimer();
    setRaceState('IDLE');
    peerService.broadcastState('LOBBY');
    setElapsedTime(0);
    setPreciseTime(null);

    // Update race status in Supabase
    await supabaseService.updateRaceStatus('lobby');
  }, [stopTimer, peerService, supabaseService]);

  // Listen for WebRTC trigger events
  useEffect(() => {
    const msg = peerService.latestMessage;
    if (!msg) return;

    if (msg.type === 'TRIGGER' && msg.payload) {
      handleTrigger(msg.payload.role as GateRole, msg.payload.timestamp);
    }
  }, [peerService.latestMessage, handleTrigger]);

  // Listen for Supabase Realtime updates to correct timing
  useEffect(() => {
    if (supabaseService.triggers.length >= 2) {
      const startTrigger = supabaseService.triggers.find(t => t.gate_role === 'START');
      const finishTrigger = supabaseService.triggers.find(t => t.gate_role === 'FINISH');

      if (startTrigger && finishTrigger) {
        const calculatedDuration = supabaseService.calculateRaceDuration();

        if (calculatedDuration !== null) {
          setIsCorrectingTime(true);
          setPreciseTime(calculatedDuration);

          // Clear the correction indicator after a short delay
          setTimeout(() => {
            setIsCorrectingTime(false);
          }, 2000);
        }
      }
    }
  }, [supabaseService]);

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
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1 bg-slate-700 rounded text-sm font-mono">
            Peers: {peerService.peers.length}
          </div>
          <div className={`px-3 py-1 rounded text-sm font-mono flex items-center space-x-1 ${peerService.connectionStatus.includes('Error') || peerService.connectionStatus.includes('Disconnected')
            ? 'bg-red-600'
            : peerService.connectionStatus === 'Online'
              ? 'bg-green-600'
              : 'bg-yellow-600'
            }`}>
            <div className={`w-2 h-2 rounded-full ${peerService.connectionStatus.includes('Error') || peerService.connectionStatus.includes('Disconnected')
              ? 'bg-red-300'
              : peerService.connectionStatus === 'Online'
                ? 'bg-green-300 animate-pulse'
                : 'bg-yellow-300'
              }`}></div>
            <span>{peerService.connectionStatus}</span>
          </div>
        </div>
      </div>

      {/* Timer Section */}
      <div className="flex-grow flex flex-col items-center justify-center p-6 space-y-8">

        {/* Main Clock */}
        <div className="text-center">
          <div className="text-9xl font-mono font-bold tracking-tighter tabular-nums text-white drop-shadow-lg relative">
            {formattedTime}
            {isCorrectingTime && (
              <div className="absolute -top-4 -right-4 bg-green-500 text-white text-xs px-2 py-1 rounded animate-pulse">
                Corrected
              </div>
            )}
          </div>
          <div className="text-slate-400 uppercase tracking-widest mt-2 font-semibold">
            {raceState}
          </div>
          {preciseTime !== null && (
            <div className="text-green-400 text-sm mt-1">
              Precise timing from database
            </div>
          )}
        </div>

        {/* Split Times Display */}
        {Object.entries(splitTimes).length > 0 && (
          <div className="w-full max-w-md space-y-2">
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider text-center mb-2">Split Times</h3>
            {Object.entries(splitTimes).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([key, time], index) => (
              <div key={key} className="flex justify-between items-center bg-slate-800/50 px-4 py-2 rounded border border-slate-700">
                <span className="text-slate-400 text-sm">Split {index + 1}</span>
                <span className="font-mono text-xl font-bold text-yellow-400">
                  {Math.floor(time / 1000)}.{Math.floor((time % 1000) / 10).toString().padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        )}

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
              className={`p-3 rounded-lg text-center ${peer.role === GateRole.START ? 'bg-green-700' :
                peer.role === GateRole.FINISH ? 'bg-blue-700' :
                  peer.role === GateRole.SPLIT ? 'bg-yellow-700' :
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
                  setRole(firstUnassigned.id, GateRole.START);
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
                  setRole(firstUnassigned.id, GateRole.FINISH);
                }
              }}
              disabled={!peerService.peers.some(p => p.role === 'NONE')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              Set Finish
            </button>

            <button
              onClick={() => {
                const firstUnassigned = peerService.peers.find(p => p.role === 'NONE');
                if (firstUnassigned) {
                  setRole(firstUnassigned.id, GateRole.SPLIT);
                }
              }}
              disabled={!peerService.peers.some(p => p.role === 'NONE')}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              Set Split
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