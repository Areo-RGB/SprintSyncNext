# SprintSync Project Overview

## Project Purpose
SprintSync is a real-time distributed timing system for sprint racing. The application allows multiple devices to synchronize timing measurements using WebRTC (PeerJS) and motion detection. One device acts as a host/timer display while others function as start/finish gates with camera-based motion detection.

## Tech Stack
- **Frontend**: Next.js 15.5.7 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Real-time Communication**: PeerJS (WebRTC)
- **Motion Detection**: Browser camera API with canvas-based frame differencing
- **Build Tools**: Next.js built-in tooling
- **Code Quality**: ESLint, Prettier

## Application Architecture
- **Single Page Application** with multiple views:
  - Landing page with host/join options
  - Host View: Timer display for race coordinator
  - Gate View: Camera interface for motion detection gates
- **Peer-to-Peer Communication**: WebRTC-based real-time data exchange
- **Motion Detection**: Real-time video processing with configurable sensitivity

## Key Features
1. **Session Management**: 4-digit session codes for easy connections
2. **Role Assignment**: Start gate and finish gate roles
3. **Real-time Motion Detection**: Configurable sensitivity and threshold
4. **Distributed Timing**: Synchronized timing across multiple devices
5. **Camera Integration**: Environment-facing camera preference for gates

## Development Environment
- **Node.js**: Modern version with npm package management
- **Browser Support**: Modern browsers with WebRTC and camera API support
- **Development Server**: `npm run dev` on localhost:3000
- **Hot Reload**: Next.js development mode with fast refresh

## Current Project Structure
```
SprintSyncNext/
├── app/                 # Next.js app directory
├── components/          # Reusable React components
├── lib/                # Utility libraries
├── public/             # Static assets
├── types/              # TypeScript type definitions
└── package.json        # Dependencies and scripts
```

## Last Updated
December 4, 2025 - Project structure and overview updated for current development state