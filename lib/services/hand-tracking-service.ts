// lib/services/hand-tracking-service.ts
// Hand tracking service using MediaPipe Hands for real-time hand detection

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandTrackingResult {
  detected: boolean;
  landmarks: HandLandmark[] | null;
  palmCenter: { x: number; y: number } | null;
  fingertips: { x: number; y: number }[] | null;
  boundingBox: BoundingBox | null;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Hand landmark indices (MediaPipe)
const LANDMARK_INDICES = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

// Finger connections for drawing skeleton
export const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [5, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [9, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [13, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [0, 17],
];

// MediaPipe types
interface MediaPipeHands {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (results: MediaPipeResults) => void) => void;
  send: (input: { image: HTMLVideoElement | HTMLCanvasElement }) => Promise<void>;
  close?: () => void;
}

interface MediaPipeResults {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
}

interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

// MediaPipe Hands instance
let handsInstance: MediaPipeHands | null = null;
let isInitializing = false;
let lastResults: MediaPipeResults | null = null;

/**
 * Initialize MediaPipe Hands
 */
export async function initializeHandTracking(): Promise<boolean> {
  if (handsInstance) return true;
  if (isInitializing) return false;
  
  isInitializing = true;
  
  try {
    // Dynamic import for MediaPipe
    const { Hands } = await import('@mediapipe/hands');
    
    handsInstance = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    
    handsInstance.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });
    
    handsInstance.onResults((results: MediaPipeResults) => {
      lastResults = results;
    });
    
    // Initialize by sending a blank frame
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 640, 480);
      await handsInstance.send({ image: canvas });
    }
    
    isInitializing = false;
    return true;
  } catch (error) {
    console.error('Failed to initialize hand tracking:', error);
    isInitializing = false;
    return false;
  }
}

/**
 * Process video frame for hand detection
 */
export async function detectHands(
  video: HTMLVideoElement,
  canvasWidth: number,
  canvasHeight: number
): Promise<HandTrackingResult> {
  if (!handsInstance) {
    return {
      detected: false,
      landmarks: null,
      palmCenter: null,
      fingertips: null,
      boundingBox: null,
    };
  }
  
  try {
    await handsInstance.send({ image: video });
    
    if (!lastResults || !lastResults.multiHandLandmarks || lastResults.multiHandLandmarks.length === 0) {
      return {
        detected: false,
        landmarks: null,
        palmCenter: null,
        fingertips: null,
        boundingBox: null,
      };
    }
    
    const landmarks = lastResults.multiHandLandmarks[0];
    
    // Convert normalized coordinates to pixel coordinates
    const pixelLandmarks: HandLandmark[] = landmarks.map((lm: NormalizedLandmark) => ({
      x: lm.x * canvasWidth,
      y: lm.y * canvasHeight,
      z: lm.z,
    }));
    
    // Calculate palm center (average of wrist and MCP joints)
    const palmPoints = [
      pixelLandmarks[LANDMARK_INDICES.WRIST],
      pixelLandmarks[LANDMARK_INDICES.INDEX_MCP],
      pixelLandmarks[LANDMARK_INDICES.MIDDLE_MCP],
      pixelLandmarks[LANDMARK_INDICES.RING_MCP],
      pixelLandmarks[LANDMARK_INDICES.PINKY_MCP],
    ];
    
    const palmCenter = {
      x: palmPoints.reduce((sum, p) => sum + p.x, 0) / palmPoints.length,
      y: palmPoints.reduce((sum, p) => sum + p.y, 0) / palmPoints.length,
    };
    
    // Get fingertips
    const fingertips = [
      { x: pixelLandmarks[LANDMARK_INDICES.THUMB_TIP].x, y: pixelLandmarks[LANDMARK_INDICES.THUMB_TIP].y },
      { x: pixelLandmarks[LANDMARK_INDICES.INDEX_TIP].x, y: pixelLandmarks[LANDMARK_INDICES.INDEX_TIP].y },
      { x: pixelLandmarks[LANDMARK_INDICES.MIDDLE_TIP].x, y: pixelLandmarks[LANDMARK_INDICES.MIDDLE_TIP].y },
      { x: pixelLandmarks[LANDMARK_INDICES.RING_TIP].x, y: pixelLandmarks[LANDMARK_INDICES.RING_TIP].y },
      { x: pixelLandmarks[LANDMARK_INDICES.PINKY_TIP].x, y: pixelLandmarks[LANDMARK_INDICES.PINKY_TIP].y },
    ];
    
    // Calculate bounding box
    const xs = pixelLandmarks.map((l: HandLandmark) => l.x);
    const ys = pixelLandmarks.map((l: HandLandmark) => l.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const padding = 20;
    const boundingBox: BoundingBox = {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: Math.min(canvasWidth, maxX - minX + padding * 2),
      height: Math.min(canvasHeight, maxY - minY + padding * 2),
    };
    
    return {
      detected: true,
      landmarks: pixelLandmarks,
      palmCenter,
      fingertips,
      boundingBox,
    };
  } catch (error) {
    console.error('Hand detection error:', error);
    return {
      detected: false,
      landmarks: null,
      palmCenter: null,
      fingertips: null,
      boundingBox: null,
    };
  }
}

/**
 * Draw hand skeleton overlay on canvas
 */
export function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  result: HandTrackingResult,
  canvasWidth: number,
  canvasHeight: number,
  options: {
    lineColor?: string;
    jointColor?: string;
    lineWidth?: number;
    jointRadius?: number;
    mirrorX?: boolean;
  } = {}
): void {
  if (!result.detected || !result.landmarks) return;
  
  const {
    lineColor = '#00FF00',
    jointColor = '#FF0000',
    lineWidth = 3,
    jointRadius = 6,
    mirrorX = true,
  } = options;
  
  const landmarks = result.landmarks;
  
  // Helper to mirror X coordinate if needed
  const getX = (x: number) => mirrorX ? canvasWidth - x : x;
  
  ctx.save();
  
  // Draw connections (skeleton lines)
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Add glow effect
  ctx.shadowColor = lineColor;
  ctx.shadowBlur = 10;
  
  for (const [start, end] of HAND_CONNECTIONS) {
    const startLm = landmarks[start];
    const endLm = landmarks[end];
    
    ctx.beginPath();
    ctx.moveTo(getX(startLm.x), startLm.y);
    ctx.lineTo(getX(endLm.x), endLm.y);
    ctx.stroke();
  }
  
  // Draw joints (landmarks)
  ctx.shadowBlur = 0;
  
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    const isTip = [4, 8, 12, 16, 20].includes(i);
    
    // Outer circle (white border)
    ctx.beginPath();
    ctx.arc(getX(lm.x), lm.y, isTip ? jointRadius + 2 : jointRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    
    // Inner circle (colored)
    ctx.beginPath();
    ctx.arc(getX(lm.x), lm.y, isTip ? jointRadius : jointRadius - 2, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? '#FF4444' : jointColor;
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Check if hand collides with a rectangular area
 */
export function checkHandCollision(
  result: HandTrackingResult,
  rect: { x: number; y: number; width: number; height: number },
  canvasWidth: number,
  mirrorX: boolean = true
): boolean {
  if (!result.detected || !result.landmarks) return false;
  
  // Check collision with fingertips and palm center
  const pointsToCheck = [
    ...(result.fingertips || []),
    result.palmCenter,
  ].filter(Boolean) as { x: number; y: number }[];
  
  for (const point of pointsToCheck) {
    const px = mirrorX ? canvasWidth - point.x : point.x;
    const py = point.y;
    
    if (
      px >= rect.x &&
      px <= rect.x + rect.width &&
      py >= rect.y &&
      py <= rect.y + rect.height
    ) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get the primary touch point (index fingertip)
 */
export function getPrimaryTouchPoint(
  result: HandTrackingResult,
  canvasWidth: number,
  mirrorX: boolean = true
): { x: number; y: number } | null {
  if (!result.detected || !result.fingertips || result.fingertips.length < 2) {
    return null;
  }
  
  // Use index fingertip as primary touch point
  const indexTip = result.fingertips[1];
  return {
    x: mirrorX ? canvasWidth - indexTip.x : indexTip.x,
    y: indexTip.y,
  };
}

/**
 * Reset hand tracking state
 */
export function resetHandTracking(): void {
  lastResults = null;
}

/**
 * Cleanup hand tracking
 */
export function cleanupHandTracking(): void {
  if (handsInstance) {
    handsInstance.close?.();
    handsInstance = null;
  }
  lastResults = null;
  isInitializing = false;
}
