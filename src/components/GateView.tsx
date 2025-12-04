'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePeerService } from '@/lib/usePeerService';
import { useMotionService } from '@/lib/useMotionService';
import { useSupabaseService } from '@/lib/useSupabaseService';
import { GateRole } from '@/types';

type GateStatus = 'LOBBY' | 'ARMED' | 'TRIGGERED';

interface GateViewProps {
  onBack: () => void;
  myId: string;
  sessionCode: string;
}

export default function GateView({ onBack, myId, sessionCode }: GateViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerService = usePeerService();
  const motionService = useMotionService();
  const supabaseService = useSupabaseService(sessionCode);

  const [status, setStatus] = useState<GateStatus>('LOBBY');
  const [role, setRole] = useState<GateRole | 'NONE'>('NONE');
  const [isWritingToDb, setIsWritingToDb] = useState(false);

  const roleText = role ? (role === 'START' ? 'Start Gate (Sens 1)' :
    role === 'FINISH' ? 'Finish Gate (Sens 2)' :
      'Unassigned Sensor') : 'Unassigned Sensor';

  const handleMotionTrigger = useCallback(async () => {
    if (status !== 'ARMED' || !role) return;

    setStatus('TRIGGERED');
    const triggerTimestamp = Date.now();

    // Vibrate device if possible
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }

    // Send immediate signal to host via WebRTC
    if (role !== 'NONE') {
      peerService.sendTrigger(role, triggerTimestamp, supabaseService.currentRace?.id);
    }

    // Write precise timestamp to Supabase in the background
    setIsWritingToDb(true);
    try {
      await supabaseService.recordTrigger(
        role as 'START' | 'FINISH',
        myId,
        triggerTimestamp,
        1.0 // Default confidence
      );
    } catch (error) {
      console.error('Failed to write trigger to Supabase:', error);
    } finally {
      setIsWritingToDb(false);
    }
  }, [status, role, myId, peerService, supabaseService]);

  useEffect(() => {
    // Cleanup camera when component unmounts
    // Note: PeerService lifecycle is managed by PeerProvider context
    return () => {
      motionService.stopCamera();
    };
  }, [motionService]);

  useEffect(() => {
    // Listen for peer messages
    const msg = peerService.latestMessage;
    if (!msg) return;

    switch (msg.type) {
      case 'ROLE_ASSIGN':
        if (msg.payload?.role) {
          setRole(msg.payload.role);
        }
        break;
      case 'STATE_CHANGE':
        if (msg.payload?.state === 'ARMED') {
          setStatus('ARMED');
          motionService.armSystem(true);
        } else if (msg.payload?.state === 'LOBBY') {
          setStatus('LOBBY');
          motionService.armSystem(false);
        }
        break;
      case 'RESET':
        setStatus('LOBBY');
        motionService.armSystem(false);
        break;
    }
  }, [peerService.latestMessage, motionService]);

  useEffect(() => {
    // Listen for motion trigger
    if (motionService.motionDetected && status === 'ARMED') {
      handleMotionTrigger();
    }
  }, [motionService.motionDetected, status, handleMotionTrigger]);

  useEffect(() => {
    // Start camera after component mounts
    const startVideo = async () => {
      if (videoRef.current) {
        await motionService.startCamera(videoRef.current);
      }
    };

    // Small delay to ensure component is mounted
    const timeoutId = setTimeout(startVideo, 100);

    return () => clearTimeout(timeoutId);
  }, [motionService]);

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden flex flex-col">
      {/* Header / Status */}
      <div className="absolute top-0 left-0 w-full z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex justify-between items-center text-white">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <div className="text-center">
            <h2 className="font-bold text-lg text-blue-400">{myId}</h2>
            <p className="text-sm opacity-80">{roleText}</p>
          </div>
          <div className="flex items-center space-x-2">
            {isWritingToDb && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Writing to database"></div>
            )}
            <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1 ${status === 'ARMED' ? 'bg-green-600' :
              status === 'LOBBY' ? 'bg-yellow-600' :
                'bg-red-600'
              }`}>
              <div className={`w-2 h-2 rounded-full ${status === 'ARMED' ? 'bg-green-300 animate-pulse' :
                status === 'LOBBY' ? 'bg-yellow-300' :
                  'bg-red-300'
                }`}></div>
              <span>{status}</span>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-mono flex items-center space-x-1 ${peerService.connectionStatus.includes('Error') || peerService.connectionStatus.includes('Disconnected')
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
              <span className="hidden sm:inline">{peerService.connectionStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Background */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Overlay UI */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30">
          {/* Motion Detection Indicator */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center ${status === 'ARMED' ? 'bg-green-500/20 border-green-400 animate-pulse' :
              status === 'TRIGGERED' ? 'bg-red-500/20 border-red-400' :
                'bg-slate-500/20 border-slate-400'
              }`}>
              <div className={`w-24 h-24 rounded-full border-2 ${status === 'ARMED' ? 'border-green-300 animate-ping' :
                status === 'TRIGGERED' ? 'border-red-300' :
                  'border-slate-300'
                }`} />
            </div>
          </div>

          {/* Status Text */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-white text-xl font-semibold mb-2">
              {status === 'ARMED' ? 'Ready for Detection' :
                status === 'TRIGGERED' ? 'Motion Detected!' :
                  'Waiting for Connection'}
            </p>
            {role !== 'NONE' && status !== 'TRIGGERED' && (
              <p className="text-slate-300 text-sm">
                Position camera and wait for motion
              </p>
            )}
            {isWritingToDb && (
              <p className="text-green-400 text-xs mt-1 animate-pulse">
                Saving precise timing...
              </p>
            )}

            {/* Manual Trigger for Testing */}
            {status === 'ARMED' && (
              <button
                onClick={handleMotionTrigger}
                className="mt-4 px-6 py-2 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-full border border-red-400 backdrop-blur-sm transition"
              >
                MANUAL TRIGGER
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}