'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePeerService } from '@/lib/usePeerService';
import { useMotionService } from '@/lib/useMotionService';

type GateStatus = 'LOBBY' | 'ARMED' | 'TRIGGERED';
type GateRole = 'START' | 'FINISH' | 'NONE';

interface GateViewProps {
  onBack: () => void;
  myId: string;
}

export default function GateView({ onBack, myId }: GateViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerService = usePeerService();
  const motionService = useMotionService();

  const [status, setStatus] = useState<GateStatus>('LOBBY');
  const [role, setRole] = useState<GateRole>('NONE');

  const roleText = role === 'START' ? 'Start Gate (Sens 1)' :
                   role === 'FINISH' ? 'Finish Gate (Sens 2)' :
                   'Unassigned Sensor';

  const handleMotionTrigger = useCallback(() => {
    setStatus('TRIGGERED');

    // Vibrate device if possible
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }

    // Send signal to host
    peerService.sendTrigger(role as 'START' | 'FINISH', Date.now());
  }, [peerService, role]);

  useEffect(() => {
    // Initialize peer service as client when component mounts
    const initializeClient = async () => {
      try {
        await peerService.init(false);
      } catch (error) {
        console.error('Failed to initialize client:', error);
      }
    };

    initializeClient();

    return () => {
      motionService.stopCamera();
      peerService.destroy();
    };
  }, [motionService, peerService]);

  useEffect(() => {
    // Listen for peer messages
    const msg = peerService.latestMessage;
    if (!msg) return;

    switch (msg.type) {
      case 'ROLE_ASSIGN':
        setRole(msg.payload.role);
        break;
      case 'STATE_CHANGE':
        if (msg.payload.state === 'ARMED') {
          setStatus('ARMED');
          motionService.armSystem(true);
        } else if (msg.payload.state === 'LOBBY') {
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
          <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
            status === 'ARMED' ? 'bg-green-600' :
            status === 'LOBBY' ? 'bg-yellow-600' :
            'bg-red-600'
          }`}>
            {status}
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
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center ${
              status === 'ARMED' ? 'bg-green-500/20 border-green-400 animate-pulse' :
              status === 'TRIGGERED' ? 'bg-red-500/20 border-red-400' :
              'bg-slate-500/20 border-slate-400'
            }`}>
              <div className={`w-24 h-24 rounded-full border-2 ${
                status === 'ARMED' ? 'border-green-300 animate-ping' :
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
          </div>
        </div>
      </div>
    </div>
  );
}>
            {status}
          </div>
        </div>
      </div>

      {/* Camera Feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* UI Overlays */}
      <div className="relative w-full h-full z-10 pointer-events-none flex items-center justify-center">
        {/* Center ROI Box */}
        <div className={`relative w-[100px] h-[100px] border-2 transition-colors duration-200 shadow-2xl ${
          status === 'ARMED' && !motionService.motionDetected ? 'border-red-500' :
          status === 'LOBBY' ? 'border-white' :
          'border-green-500'
        } ${motionService.motionDetected ? 'bg-green-500/20' : ''}`}>

          {/* Crosshairs */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/50"></div>
          <div className="absolute left-1/2 top-0 h-full w-[1px] bg-white/50"></div>

          {/* Activity Indicator */}
          <div className="absolute -bottom-8 left-0 w-full text-center text-xs font-mono text-white bg-black/50 rounded">
            Activity: {motionService.currentDiff}
          </div>
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="absolute bottom-0 w-full z-20 p-6 bg-gradient-to-t from-black/90 to-transparent text-center">
        {status === 'LOBBY' && (
          <>
            <p className="text-gray-300">Waiting for Host to Start...</p>
            <p className="text-xs text-gray-500 mt-1">Align the center square with the movement area.</p>
          </>
        )}
        {status === 'ARMED' && (
          <>
            <p className="text-red-500 font-bold animate-pulse">SYSTEM ARMED</p>
            <p className="text-xs text-red-300">Keep steady. Any motion in box triggers signal.</p>
          </>
        )}
        {status === 'TRIGGERED' && (
          <p className="text-green-500 font-bold text-xl">MOTION SENT!</p>
        )}
      </div>
    </div>
  );
}