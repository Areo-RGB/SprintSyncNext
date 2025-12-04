// SprintSync TypeScript Pro Type Definitions
// Enhanced type safety for real-time distributed timing system

// Core domain types
export interface Session {
  id: string;
  hostId: string;
  status: SessionStatus;
  createdAt: Date;
  gates: Gate[];
  raceState: RaceState;
}

export interface Gate {
  id: string;
  peerId: string;
  role: GateRole;
  status: GateStatus;
  lastSeen: Date;
  deviceInfo: DeviceInfo;
}

export interface RaceState {
  status: RaceStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  results: RaceResult[];
}

// Enum types for better type safety
export enum SessionStatus {
  LOBBY = 'lobby',
  ARMED = 'armed',
  RACING = 'racing',
  FINISHED = 'finished'
}

export enum GateRole {
  START = 'START',
  FINISH = 'FINISH'
}

export enum GateStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  READY = 'ready',
  ARMED = 'armed',
  TRIGGERED = 'triggered',
  LOBBY = 'lobby'
}

export enum RaceStatus {
  IDLE = 'idle',
  READY = 'ready',
  ARMED = 'armed',
  RUNNING = 'running',
  COMPLETED = 'completed'
}

// Message types for WebRTC communication
export type PeerMessage =
  | JoinMessage
  | RoleAssignMessage
  | StateChangeMessage
  | TriggerMessage
  | ResetMessage;

export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  sessionId: string;
  senderId: string;
}

export interface JoinMessage extends BaseMessage {
  type: MessageType.JOIN;
  gateId: string;
  deviceInfo: DeviceInfo;
}

export interface RoleAssignMessage extends BaseMessage {
  type: MessageType.ROLE_ASSIGN;
  gateRole: GateRole;
  targetGateId: string;
}

export interface StateChangeMessage extends BaseMessage {
  type: MessageType.STATE_CHANGE;
  raceState: RaceState;
  sessionStatus: SessionStatus;
}

export interface TriggerMessage extends BaseMessage {
  type: MessageType.TRIGGER;
  gateRole: GateRole;
  timestamp: number;
  triggerData: MotionDetectionData;
}

export interface ResetMessage extends BaseMessage {
  type: MessageType.RESET;
  reason: ResetReason;
}

export enum MessageType {
  JOIN = 'JOIN',
  ROLE_ASSIGN = 'ROLE_ASSIGN',
  STATE_CHANGE = 'STATE_CHANGE',
  TRIGGER = 'TRIGGER',
  RESET = 'RESET'
}

export enum ResetReason {
  MANUAL = 'manual',
  TIMEOUT = 'timeout',
  ERROR = 'error',
  DISCONNECT = 'disconnect'
}

// Device and motion detection types
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  cameraCapabilities: CameraCapabilities;
  connectionType?: ConnectionType;
}

export interface CameraCapabilities {
  hasCamera: boolean;
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
  frameRate?: number;
}

export enum ConnectionType {
  BLUETOOTH = 'bluetooth',
  CELLULAR = 'cellular',
  ETHERNET = 'ethernet',
  WIFI = 'wifi',
  Wimax = 'wimax',
  NONE = 'none',
  OTHER = 'other'
}

export interface MotionDetectionData {
  timestamp: number;
  roi: RegionOfInterest;
  confidence: number;
  threshold: number;
  sensitivity: number;
}

export interface RegionOfInterest {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MotionDetectionConfig {
  sensitivity: number; // 0-100
  threshold: number; // pixel difference threshold
  roi: RegionOfInterest;
  disarmDuration: number; // ms to disarm after trigger
}

// Race results and timing
export interface RaceResult {
  gateId: string;
  gateRole: GateRole;
  timestamp: number;
  relativeTime?: number; // time from start trigger
  confidence: number;
}

export interface TimingAnalysis {
  totalTime: number;
  startAccuracy: number;
  finishAccuracy: number;
  averageConfidence: number;
  reliability: TimingReliability;
}

export enum TimingReliability {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// PeerJS connection types
// PeerJS interface definitions for type safety
export interface PeerJSInstance {
  id: string;
  connections: Map<string, PeerJSDataConnection>;
  destroy(): void;
  on(event: 'open', listener: (id: string) => void): void;
  on(event: 'connection', listener: (conn: PeerJSDataConnection) => void): void;
  on(event: 'error', listener: (err: PeerJSError) => void): void;
  connect(id: string): PeerJSDataConnection;
}

export interface PeerJSDataConnection {
  peer: string;
  metadata?: PeerMetadata;
  on(event: 'open', listener: () => void): void;
  on(event: 'data', listener: (data: unknown) => void): void;
  on(event: 'close', listener: () => void): void;
  on(event: 'error', listener: (err: PeerJSError) => void): void;
  send(data: unknown): void;
  close(): void;
}

export interface PeerJSError extends Error {
  type: string;
  message: string;
}

export interface PeerConnection {
  peerId: string;
  sessionId: string;
  role: PeerRole;
  status: ConnectionStatus;
  connection?: PeerJSDataConnection;
  metadata?: PeerMetadata;
}

export enum PeerRole {
  HOST = 'host',
  GATE = 'gate'
}

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export interface PeerMetadata {
  sessionId: string;
  role: PeerRole;
  gateId?: string;
  deviceInfo: DeviceInfo;
}

// Utility types for better type safety
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Event types for type-safe event handling
export interface SessionEvents {
  'gate:joined': (gate: Gate) => void;
  'gate:left': (gateId: string) => void;
  'race:started': (startTime: number) => void;
  'race:finished': (results: RaceResult[]) => void;
  'session:reset': (reason: ResetReason) => void;
  'error': (error: SprintSyncError) => void;
}

export interface MotionEvents {
  'motion:detected': (data: MotionDetectionData) => void;
  'motion:armed': () => void;
  'motion:disarmed': () => void;
  'camera:ready': (capabilities: CameraCapabilities) => void;
  'camera:error': (error: Error) => void;
}

// Error types
export interface SprintSyncError extends Error {
  code: ErrorCode;
  context?: Record<string, unknown>;
  recoverable: boolean;
}

export enum ErrorCode {
  // Connection errors
  PEER_CONNECTION_FAILED = 'PEER_CONNECTION_FAILED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  GATE_DISCONNECTED = 'GATE_DISCONNECTED',

  // Camera errors
  CAMERA_ACCESS_DENIED = 'CAMERA_ACCESS_DENIED',
  CAMERA_NOT_AVAILABLE = 'CAMERA_NOT_AVAILABLE',
  MOTION_DETECTION_FAILED = 'MOTION_DETECTION_FAILED',

  // Race errors
  INVALID_RACE_STATE = 'INVALID_RACE_STATE',
  TIMING_INCONSISTENCY = 'TIMING_INCONSISTENCY',

  // System errors
  STORAGE_ERROR = 'STORAGE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Configuration types with better validation
export interface SprintSyncConfig {
  session: SessionConfig;
  motion: MotionDetectionConfig;
  network: NetworkConfig;
  performance: PerformanceConfig;
}

export interface SessionConfig {
  codeLength: 4 | 6; // 4 or 6 digit codes
  timeout: number; // session timeout in ms
  maxGates: number;
  autoResetDelay: number; // ms after race before auto-reset
}

export interface NetworkConfig {
  iceServers: RTCIceServer[];
  connectionTimeout: number; // ms
  heartbeatInterval: number; // ms
  maxRetries: number;
}

export interface PerformanceConfig {
  enableMetrics: boolean;
  reportInterval: number; // ms
  debugMode: boolean;
}

// Type guards for runtime type checking
export function isPeerMessage(obj: unknown): obj is PeerMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'timestamp' in obj &&
    'sessionId' in obj &&
    'senderId' in obj &&
    Object.values(MessageType).includes((obj as any).type)
  );
}

export function isSprintSyncError(obj: unknown): obj is SprintSyncError {
  return (
    obj instanceof Error &&
    'code' in obj &&
    'recoverable' in obj &&
    Object.values(ErrorCode).includes((obj as any).code)
  );
}

// Helper types for React component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

export interface SessionStateProps {
  session: Session;
  isHost: boolean;
  onSessionUpdate: (session: Session) => void;
}

export interface MotionDetectionProps {
  isActive: boolean;
  config: MotionDetectionConfig;
  onMotionDetected: (data: MotionDetectionData) => void;
  onStatusChange: (status: GateStatus) => void;
}

// Export commonly used types for convenience
export type {
  // Re-export React types for consistency
  ReactElement,
  ReactNode,
  ReactPortal,
  ComponentType,
  FC,
  PropsWithChildren,
} from 'react';

// Browser API Response Types
export interface MediaDevicesResponse {
  success: boolean;
  stream?: MediaStream;
  error?: {
    name: string;
    message: string;
    constraint?: string;
  };
}

export interface CameraCapabilities {
  deviceId: string;
  label: string;
  capabilities: {
    width?: { min: number; max: number; ideal?: number };
    height?: { min: number; max: number; ideal?: number };
    facingMode?: string[];
    frameRate?: { min: number; max: number };
  };
}

export interface NetworkInfo {
  type: ConnectionType;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    altitudeAccuracy?: number;
    heading?: number;
    speed?: number;
  };
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
  TIMEOUT: number;
}

// Performance API Types
export interface PerformanceMetrics {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  timing: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
  };
  navigation: {
    type: number;
    redirectCount: number;
  };
}

// Global type augmentation for enhanced browser APIs
declare global {
  interface Navigator {
    connection?: NetworkInfo;
    mozConnection?: NetworkInfo;
    webkitConnection?: NetworkInfo;
    deviceMemory?: number;
    hardwareConcurrency?: number;
  }

  interface Performance {
    memory?: PerformanceMetrics['memory'];
    getEntriesByType(
      type: 'navigation' | 'paint' | 'resource'
    ): PerformanceEntry[];
  }
}