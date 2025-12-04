# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SprintSync is a real-time distributed timing system for sprint racing built with Next.js 15, React 19, and TypeScript. The application enables multiple devices to synchronize timing measurements using WebRTC (PeerJS) and motion detection via device cameras.

## Development Commands

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting and type checking
npm run lint
npm run type-check

# Code formatting
npm run format
npm run format:check
```

## Application Architecture

### Core Components Structure
- **Single Page Application** with multiple views managed by state in `app/page.tsx`
- **Three main views**: Landing page, Host View (timer display), Gate View (camera interface)
- **Real-time communication** via WebRTC using PeerJS for peer-to-peer connections
- **Motion detection** using browser camera API with canvas-based frame differencing

### Key Hooks and Services

#### `lib/usePeerService.ts`
Manages all WebRTC communication and peer connections:
- Host mode: Generates 4-digit session IDs, accepts incoming connections
- Client mode: Connects to host by session ID, sends triggers
- Message types: JOIN, ROLE_ASSIGN, STATE_CHANGE, TRIGGER, RESET
- Handles connection lifecycle, role assignment, and message broadcasting

#### `lib/useMotionService.ts`
Handles camera-based motion detection:
- Requests camera access with environment-facing preference
- Processes video frames using canvas for pixel differencing
- Configurable sensitivity and threshold parameters
- ROI-based detection (100x100px center region)

### Application Flow

1. **Session Creation**: Host starts session → generates 4-digit code → displays as timer
2. **Device Connection**: Gates join using session code → handshake with host → await role assignment
3. **Race Setup**: Host assigns START/FINISH roles → arms system → all gates ready
4. **Race Execution**: Start gate motion → timer starts → finish gate motion → timer stops
5. **Results**: Time displayed on host → system returns to lobby state

### State Management Patterns

- **Centralized in hooks**: All peer and motion state managed through custom hooks
- **Event-driven**: Communication via message passing between peers
- **Local state**: Each component manages its own UI state (raceState, status, etc.)
- **No external state management**: Uses React built-in state and effects

### Key Technical Details

#### PeerJS Integration
- Host uses short 4-digit numeric IDs (1000-9999) for easy entry
- Connections are bi-directional with role-based message handling
- Automatic reconnection and error handling built-in

#### Motion Detection Algorithm
- Frame differencing in center ROI (100x100px)
- Pixel threshold comparison (RGB channels > 50 difference)
- Sensitivity based on count of changed pixels (default: 20 pixels)
- Immediate disarming after trigger to prevent false positives

#### PWA Features
- Service worker registration in `app/layout.tsx`
- Mobile-optimized viewport and theme settings
- App manifest for installability

### File Organization

- `app/`: Next.js app router pages (layout, main page, globals)
- `components/`: React components for different views (HostView, GateView)
- `lib/`: Custom hooks and business logic (usePeerService, useMotionService)
- `public/`: Static assets and PWA manifest files