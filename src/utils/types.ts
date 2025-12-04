// TypeScript Pro Utility Functions
// Runtime type checking and type guards for SprintSync

import type {
  PeerMessage,
  SprintSyncError,
  MotionDetectionData,
  DeviceInfo,
  MediaDevicesResponse,
  CameraCapabilities,
  NetworkInfo,
  GeolocationPosition,
  GeolocationError,
  PerformanceMetrics
} from '@/types';

import {
  MessageType,
  ErrorCode,
  SessionStatus,
  RaceStatus,
  GateStatus,
  ConnectionStatus
} from '@/types';

/**
 * Type guard to verify if a value is a valid MessageType
 */
export function isValidMessageType(value: unknown): value is MessageType {
  return typeof value === 'string' &&
         Object.values(MessageType).includes(value as MessageType);
}

/**
 * Enhanced type guard for PeerMessage objects with generic constraint
 */
export function isPeerMessage<T extends PeerMessage>(
  obj: unknown,
  messageType?: MessageType
): obj is T {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const message = obj as Record<string, unknown>;
  const hasCorrectType = messageType
    ? message.type === messageType
    : isValidMessageType(message.type);

  return (
    hasCorrectType &&
    typeof message.timestamp === 'number' &&
    typeof message.sessionId === 'string' &&
    typeof message.senderId === 'string'
  );
}

/**
 * Type guard for specific message types
 */
export function isJoinMessage(obj: unknown): obj is Extract<PeerMessage, { type: MessageType.JOIN }> {
  return isPeerMessage(obj, MessageType.JOIN) &&
         'gateId' in obj &&
         'deviceInfo' in obj;
}

export function isRoleAssignMessage(obj: unknown): obj is Extract<PeerMessage, { type: MessageType.ROLE_ASSIGN }> {
  return isPeerMessage(obj, MessageType.ROLE_ASSIGN) &&
         'gateRole' in obj &&
         'targetGateId' in obj;
}

export function isTriggerMessage(obj: unknown): obj is Extract<PeerMessage, { type: MessageType.TRIGGER }> {
  return isPeerMessage(obj, MessageType.TRIGGER) &&
         'gateRole' in obj &&
         'timestamp' in obj &&
         'triggerData' in obj;
}


/**
 * Type guard for SprintSyncError objects
 */
export function isSprintSyncError(obj: unknown): obj is SprintSyncError {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const error = obj as SprintSyncError;
  return (
    error instanceof Error &&
    'code' in error &&
    'recoverable' in error &&
    Object.values(ErrorCode).includes(error.code as ErrorCode) &&
    typeof error.recoverable === 'boolean'
  );
}

/**
 * Runtime type checking for SessionStatus
 */
export function validateSessionState(state: unknown): SessionStatus {
  if (typeof state !== 'string' || !Object.values(SessionStatus).includes(state as SessionStatus)) {
    throw new Error(`Invalid session state: ${state}`);
  }
  return state as SessionStatus;
}

/**
 * Runtime type checking for RaceStatus
 */
export function validateRaceStatus(status: unknown): RaceStatus {
  if (typeof status !== 'string' || !Object.values(RaceStatus).includes(status as RaceStatus)) {
    throw new Error(`Invalid race status: ${status}`);
  }
  return status as RaceStatus;
}

/**
 * Runtime type checking for GateStatus
 */
export function validateGateStatus(status: unknown): GateStatus {
  if (typeof status !== 'string' || !Object.values(GateStatus).includes(status as GateStatus)) {
    throw new Error(`Invalid gate status: ${status}`);
  }
  return status as GateStatus;
}

/**
 * Runtime type checking for ConnectionStatus
 */
export function validateConnectionStatus(status: unknown): ConnectionStatus {
  if (typeof status !== 'string' || !Object.values(ConnectionStatus).includes(status as ConnectionStatus)) {
    throw new Error(`Invalid connection status: ${status}`);
  }
  return status as ConnectionStatus;
}

/**
 * Type guard for MotionDetectionData
 */
export function isMotionDetectionData(obj: unknown): obj is MotionDetectionData {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const data = obj as Record<string, unknown>;
  return (
    typeof data.timestamp === 'number' &&
    typeof data.roi === 'object' &&
    data.roi !== null &&
    typeof (data.roi as any).x === 'number' &&
    typeof (data.roi as any).y === 'number' &&
    typeof (data.roi as any).width === 'number' &&
    typeof (data.roi as any).height === 'number' &&
    typeof data.confidence === 'number' &&
    typeof data.threshold === 'number' &&
    typeof data.sensitivity === 'number'
  );
}

/**
 * Type guard for DeviceInfo
 */
export function isDeviceInfo(obj: unknown): obj is DeviceInfo {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const info = obj as Record<string, unknown>;
  return (
    typeof info.userAgent === 'string' &&
    typeof info.platform === 'string' &&
    typeof info.cameraCapabilities === 'object' &&
    info.cameraCapabilities !== null &&
    typeof (info.cameraCapabilities as any).hasCamera === 'boolean'
  );
}

/**
 * Utility function to create type-safe error objects
 */
export function createSprintSyncError(
  message: string,
  code: ErrorCode,
  context?: Record<string, unknown>,
  recoverable: boolean = true
): SprintSyncError {
  const error = new Error(message) as SprintSyncError;
  error.code = code;
  if (context !== undefined) {
    error.context = context;
  }
  error.recoverable = recoverable;
  return error;
}

/**
 * Type-safe JSON parser with enhanced generic constraints
 */
export function safeJsonParse<T>(
  json: string,
  fallback?: T,
  validator?: (obj: unknown) => obj is T
): T | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (validator && !validator(parsed)) {
      console.warn('JSON parsed but failed validation:', parsed);
      return fallback ?? null;
    }
    return parsed as T;
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback ?? null;
  }
}

/**
 * Enhanced type guard with custom validator
 */
export function createTypeGuard<T>(
  validator: (obj: unknown) => boolean
): (obj: unknown) => obj is T {
  return (obj: unknown): obj is T => {
    try {
      return validator(obj);
    } catch (error) {
      console.warn('Type guard validation error:', error);
      return false;
    }
  };
}

/**
 * Generic function to filter arrays by type guard
 */
export function filterByTypeGuard<T>(
  array: unknown[],
  typeGuard: (item: unknown) => item is T
): T[] {
  return array.filter(typeGuard) as T[];
}

/**
 * Type-safe localStorage operations
 */
export const storage = {
  get: <T>(key: string, fallback?: T): T | null => {
    if (typeof window === 'undefined') return fallback ?? null;

    try {
      const item = localStorage.getItem(key);
      return item ? safeJsonParse<T>(item, fallback) : fallback ?? null;
    } catch (error) {
      console.warn(`Failed to get ${key} from localStorage:`, error);
      return fallback ?? null;
    }
  },

  set: <T>(key: string, value: T): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to set ${key} in localStorage:`, error);
      return false;
    }
  },

  remove: (key: string): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
      return false;
    }
  },

  clear: (): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
      return false;
    }
  }
};

/**
 * Type-safe performance measurement utilities
 */
export class PerformanceMonitor {
  private static measurements = new Map<string, number>();

  static start(label: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${label}-start`);
      this.measurements.set(label, Date.now());
    }
  }

  static end(label: string): number | null {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${label}-end`);

      try {
        performance.measure(label, `${label}-start`, `${label}-end`);
        const entries = performance.getEntriesByName(label, 'measure');
        return entries.length > 0 ? entries[entries.length - 1].duration : null;
      } catch (error) {
        console.warn(`Performance measurement failed for ${label}:`, error);
      }
    }

    const startTime = this.measurements.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.measurements.delete(label);
      return duration;
    }

    return null;
  }

  static measureAsync<T>(label: string, fn: () => Promise<T>): Promise<[T, number | null]> {
    this.start(label);
    return fn().then(result => {
      const duration = this.end(label);
      return [result, duration] as [T, number | null];
    }).catch(error => {
      this.end(label);
      throw error;
    });
  }

  static measureSync<T>(label: string, fn: () => T): [T, number | null] {
    this.start(label);
    const result = fn();
    const duration = this.end(label);
    return [result, duration];
  }
}

/**
 * Type-safe event emitter for better type checking
 */
export interface TypedEventTarget<T extends Record<string, any[]>> {
  addListener<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void;
  removeListener<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void;
  emit<K extends keyof T>(event: K, ...args: T[K]): void;
}

export class EventEmitter<T extends Record<string, any[]>> implements TypedEventTarget<T> {
  private listeners = new Map<keyof T, Set<Function>>();

  addListener<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  removeListener<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error);
        }
      });
    }
  }

  once<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
    const onceListener = (...args: T[K]) => {
      listener(...args);
      this.removeListener(event, onceListener);
    };
    this.addListener(event, onceListener);
  }

  removeAllListeners(event?: keyof T): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/**
 * Type-safe debounce utility
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Type-safe throttle utility
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

// Browser API Utility Functions with Proper Typing

/**
 * Type-safe camera access utility
 */
export async function getCameraAccess(
  constraints?: MediaStreamConstraints
): Promise<MediaDevicesResponse> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints || {
      video: {
        facingMode: 'environment',
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    return {
      success: true,
      stream
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      error: {
        name: err.name,
        message: err.message
      }
    };
  }
}

/**
 * Type-safe camera enumeration utility
 */
export async function getCameraCapabilities(): Promise<CameraCapabilities[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    return videoDevices.map(device => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${device.deviceId.slice(0, 4)}...`,
      capabilities: {}, // Would need MediaDevices.getSupportedConstraints() for full capabilities
      hasCamera: true
    }));
  } catch (error) {
    console.warn('Failed to enumerate camera devices:', error);
    return [];
  }
}

/**
 * Type-safe network information utility
 */
export function getNetworkInfo(): NetworkInfo | null {
  const connection = navigator.connection ||
                   navigator.mozConnection ||
                   navigator.webkitConnection;

  if (!connection) return null;

  return {
    type: connection.type as any,
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData
  };
}

/**
 * Type-safe geolocation utility
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            ...(position.coords.altitude !== null && { altitude: position.coords.altitude }),
            ...(position.coords.altitudeAccuracy !== null && { altitudeAccuracy: position.coords.altitudeAccuracy }),
            ...(position.coords.heading !== null && { heading: position.coords.heading }),
            ...(position.coords.speed !== null && { speed: position.coords.speed })
          },
          timestamp: position.timestamp
        });
      },
      (error) => {
        reject({
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        } as GeolocationError);
      }
    );
  });
}

/**
 * Type-safe performance metrics utility
 */
export function getPerformanceMetrics(): PerformanceMetrics | null {
  if (typeof performance === 'undefined') return null;

  const timing = performance.timing;
  if (!timing) return null;

  const paintEntries = performance.getEntriesByType?.('paint');
  const firstPaint = paintEntries?.find(entry => entry.name === 'first-paint')?.startTime;
  const firstContentfulPaint = paintEntries?.find(entry => entry.name === 'first-contentful-paint')?.startTime;

  // Get navigation type and redirect count from performance.navigation (legacy API)
  // with fallback values if API is not available
  const navigation = (performance as any).navigation;
  const navigationType = navigation?.type ?? 0; // 0 = TYPE_NAVIGATE (default)
  const redirectCount = navigation?.redirectCount ?? 0;

  return {
    memory: (performance as any).memory,
    timing: {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart,
      ...(firstPaint !== undefined && { firstPaint }),
      ...(firstContentfulPaint !== undefined && { firstContentfulPaint })
    },
    navigation: {
      type: navigationType,
      redirectCount
    }
  };
}