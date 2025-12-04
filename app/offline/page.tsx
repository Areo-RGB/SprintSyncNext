'use client';

import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800 rounded-full mb-4">
            <svg
              className="w-10 h-10 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isOnline ? 'Connection Restored' : 'You\'re Offline'}
          </h1>
          <p className="text-slate-400">
            {isOnline
              ? 'Your connection has been restored. You can continue using SprintSync.'
              : 'No internet connection detected. Some features may not be available.'}
          </p>
        </div>

        <div className="space-y-4">
          {isOnline ? (
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Available Offline Features:</h3>
              <ul className="text-slate-400 text-sm space-y-1 text-left">
                <li>• View cached sprint data</li>
                <li>• Create new sprints (will sync when online)</li>
                <li>• View app settings</li>
                <li>• Use previously loaded features</li>
              </ul>
            </div>
          )}
        </div>

        <div className="mt-8">
          <p className="text-slate-500 text-sm">
            SprintSync automatically saves your work locally.
            <br />
            Changes will sync when you&apos;re back online.
          </p>
        </div>
      </div>
    </div>
  );
}