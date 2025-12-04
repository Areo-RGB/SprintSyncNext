'use client';

import { useState } from 'react';
import HostView from '@/components/HostView';
import GateView from '@/components/GateView';
import { usePeerService } from '@/lib/usePeerService';

type AppMode = 'LANDING' | 'HOST_VIEW' | 'GATE_VIEW';

export default function Home() {
  const [mode, setMode] = useState<AppMode>('LANDING');
  const [isBusy, setIsBusy] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [deviceName, setDeviceName] = useState('Start Gate');
  const peerService = usePeerService();

  const startHost = async () => {
    setIsBusy(true);
    try {
      await peerService.init(true);
      setMode('HOST_VIEW');
    } catch (e) {
      alert('Failed to start host: ' + e);
    } finally {
      setIsBusy(false);
    }
  };

  const joinSession = async () => {
    if (!joinId || joinId.length !== 4) return;
    setIsBusy(true);
    try {
      await peerService.init(false);
      peerService.connectToHost(joinId, deviceName);
      setMode('GATE_VIEW');
    } catch (e) {
      alert('Failed to join: ' + e);
    } finally {
      setIsBusy(false);
    }
  };

  const appendDigit = (digit: number) => {
    if (joinId.length < 4) {
      setJoinId(prev => prev + digit);
    }
  };

  const removeDigit = () => {
    setJoinId(prev => prev.slice(0, -1));
  };

  if (mode === 'HOST_VIEW') {
    return <HostView onBack={() => setMode('LANDING')} myId={peerService.myId} />;
  }

  if (mode === 'GATE_VIEW') {
    return <GateView onBack={() => setMode('LANDING')} myId={peerService.myId} />;
  }

  return (
    <main className="w-full h-full font-sans text-white min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          SPRINT SYNC
        </h1>
        <p className="text-slate-400 mt-1 font-mono text-xs">Precision Distributed Timing</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Host Card */}
        <button
          onClick={startHost}
          disabled={isBusy}
          className="w-full group relative overflow-hidden bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 transition-all hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/20 text-left flex items-center justify-between disabled:opacity-50"
        >
          <div>
            <h2 className="text-xl font-bold text-white">Start New Session</h2>
            <p className="text-slate-400 text-xs">I am the timer display</p>
          </div>
          <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
          </div>
        </button>

        {/* Join Card */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Join Session</h2>

          <div className="space-y-4">
            {/* Device Role Selection */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Select Gate Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeviceName('Start Gate')}
                  className={`h-12 rounded-lg border font-bold text-sm transition hover:border-blue-500 focus:outline-none relative overflow-hidden ${
                    deviceName === 'Start Gate'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-900 border-slate-600 text-slate-400'
                  }`}
                >
                  START
                </button>
                <button
                  onClick={() => setDeviceName('Finish Gate')}
                  className={`h-12 rounded-lg border font-bold text-sm transition hover:border-purple-500 focus:outline-none relative overflow-hidden ${
                    deviceName === 'Finish Gate'
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-slate-900 border-slate-600 text-slate-400'
                  }`}
                >
                  FINISH
                </button>
              </div>
            </div>

            {/* ID Display */}
            <div className="relative">
               <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 text-center">Session Code</label>
               <div className={`h-16 w-full bg-slate-900 border-2 rounded-xl flex items-center justify-center space-x-4 transition-colors ${
                 joinId.length === 4 ? 'border-emerald-500' : 'border-slate-700'
               }`}>
                 {[0, 1, 2, 3].map((i) => (
                   <div key={i} className="w-8 text-center text-3xl font-mono font-bold">
                     {joinId[i] || '•'}
                   </div>
                 ))}
               </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6,7,8,9].map((num) => (
                <button
                  key={num}
                  onClick={() => appendDigit(num)}
                  className="h-12 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-lg text-lg font-bold transition shadow-lg shadow-slate-900/50"
                >
                  {num}
                </button>
              ))}
              <div className="pointer-events-none"></div>
              <button
                onClick={() => appendDigit(0)}
                className="h-12 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-lg text-lg font-bold transition shadow-lg shadow-slate-900/50"
              >
                0
              </button>
              <button
                onClick={removeDigit}
                className="h-12 bg-slate-800 hover:bg-red-900/30 text-red-400 rounded-lg flex items-center justify-center transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"></path>
                </svg>
              </button>
            </div>

            <button
              onClick={joinSession}
              disabled={joinId.length !== 4 || isBusy}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl font-bold transition shadow-lg shadow-emerald-900/50 mt-2"
            >
              CONNECT CAMERA
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-xs text-slate-600">
        v1.0.1 • WebRTC • Motion Detection
      </div>
    </main>
  );
}