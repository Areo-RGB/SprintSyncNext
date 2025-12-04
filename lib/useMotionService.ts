import { useState, useEffect, useRef, useCallback } from 'react';

export const useMotionService = () => {
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [motionDetected, setMotionDetected] = useState<boolean>(false);
  const [currentDiff, setCurrentDiff] = useState<number>(0);

  // Configuration
  const roiSize = 100; // 100x100 pixels
  const threshold = 50; // Pixel difference threshold
  const sensitivity = 20; // Number of pixels that need to change

  useEffect(() => {
    // Initialize canvas
    const canvas = document.createElement('canvas');
    canvas.width = roiSize;
    canvas.height = roiSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      canvasRef.current = canvas;
      ctxRef.current = ctx;
    }

    return () => {
      stopCamera();
    };
  }, []);

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
  }, []);

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

  const armSystem = useCallback((armed: boolean) => {
    setIsArmed(armed);
    if (armed) {
      setMotionDetected(false);
    }
  }, []);

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
      const sx = (video.videoWidth - roiSize) / 2;
      const sy = (video.videoHeight - roiSize) / 2;

      // Draw only the ROI to the internal canvas
      ctx.drawImage(video, sx, sy, roiSize, roiSize, 0, 0, roiSize, roiSize);

      const frameData = ctx.getImageData(0, 0, roiSize, roiSize);
      const currentFrame = frameData.data;

      if (previousFrameRef.current) {
        let diffCount = 0;
        let totalDiff = 0;

        // Loop through pixels (R, G, B, A) - step by 4
        for (let i = 0; i < currentFrame.length; i += 4) {
          const rDiff = Math.abs(currentFrame[i] - previousFrameRef.current[i]);
          const gDiff = Math.abs(currentFrame[i+1] - previousFrameRef.current[i+1]);
          const bDiff = Math.abs(currentFrame[i+2] - previousFrameRef.current[i+2]);

          if (rDiff + gDiff + bDiff > threshold) {
            diffCount++;
            totalDiff += (rDiff + gDiff + bDiff);
          }
        }

        setCurrentDiff(diffCount);

        if (isArmed && diffCount > sensitivity) {
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
  }, [isArmed, threshold, sensitivity, roiSize]);

  return {
    isArmed,
    motionDetected,
    currentDiff,
    startCamera,
    stopCamera,
    armSystem
  };
};