import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MotionDetectionConfig } from '@/types';

const DEFAULT_CONFIG: MotionDetectionConfig = {
  sensitivity: 20, // 0-100
  threshold: 50, // pixel difference threshold
  roi: { x: 0, y: 0, width: 100, height: 100 },
  disarmDuration: 1000 // ms to disarm after trigger
};

export const useMotionService = (config: Partial<MotionDetectionConfig> = {}) => {
  const motionConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [motionDetected, setMotionDetected] = useState<boolean>(false);
  const [currentDiff, setCurrentDiff] = useState<number>(0);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Initialize canvas
    const canvas = document.createElement('canvas');
    canvas.width = motionConfig.roi.width;
    canvas.height = motionConfig.roi.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      canvasRef.current = canvas;
      ctxRef.current = ctx;
    }

    return () => {
      stopCamera();
    };
  }, [motionConfig.roi, stopCamera]);

  const detectMotion = useCallback((video: HTMLVideoElement) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const stream = streamRef.current;

    if (!canvas || !ctx || !stream) return;

    const loop = () => {
      if (!stream || !ctx || video.paused || video.ended) {
        animationFrameIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // Calculate center ROI
      const sx = (video.videoWidth - motionConfig.roi.width) / 2;
      const sy = (video.videoHeight - motionConfig.roi.height) / 2;

      // Draw only ROI to internal canvas
      ctx.drawImage(video, sx, sy, motionConfig.roi.width, motionConfig.roi.height,
                   0, 0, motionConfig.roi.width, motionConfig.roi.height);

      const frameData = ctx.getImageData(0, 0, motionConfig.roi.width, motionConfig.roi.height);
      const currentFrame = frameData.data;

      if (previousFrameRef.current) {
        let diffCount = 0;
        let totalDiff = 0;
        const prevFrame = previousFrameRef.current;

        // Loop through pixels (R, G, B, A) - step by 4
        for (let i = 0; i < currentFrame.length; i += 4) {
          const rDiff = Math.abs(currentFrame[i] - prevFrame[i]);
          const gDiff = Math.abs(currentFrame[i+1] - prevFrame[i+1]);
          const bDiff = Math.abs(currentFrame[i+2] - prevFrame[i+2]);

          if (rDiff + gDiff + bDiff > motionConfig.threshold) {
            diffCount++;
            totalDiff += (rDiff + gDiff + bDiff);
          }
        }

        setCurrentDiff(diffCount);

        if (isArmed && diffCount > motionConfig.sensitivity) {
          // Trigger!
          setMotionDetected(true);
          setIsArmed(false); // Disarm immediately to prevent double trigger
        }
      }

      // Store current frame as previous
      previousFrameRef.current = new Uint8ClampedArray(currentFrame);

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    loop();
  }, [isArmed, motionConfig]);

  const startCamera = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      videoElement.srcObject = stream;
      videoElement.play();

      detectMotion(videoElement);
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  }, [detectMotion]);

  const armSystem = useCallback((armed: boolean) => {
    setIsArmed(armed);
    if (armed) {
      setMotionDetected(false);
    }
  }, []);

  return {
    isArmed,
    motionDetected,
    currentDiff,
    startCamera,
    stopCamera,
    armSystem
  };
};