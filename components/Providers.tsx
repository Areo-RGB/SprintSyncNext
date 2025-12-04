'use client';

import { ReactNode } from 'react';
import { PeerProvider } from '@/lib/usePeerService';

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <PeerProvider>
            {children}
        </PeerProvider>
    );
}
