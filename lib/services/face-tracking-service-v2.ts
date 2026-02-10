// lib/services/face-tracking-service-v2.ts
// Highly accurate face tracking optimized for real-time game play

export interface TrackingResult {
  lane: number;
  confidence: number;
  x: number;
  boundingBox: BoundingBox | null;
  detectionMethod: 'face' | 'skinColor' | 'motion' | 'none';
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TrackingConfig {
  canvasWidth: number;
  canvasHeight: number;
}

// State
let smoothedX = 0.5;
let smoothedBox: BoundingBox | null = null;
let frameCount = 0;
let consecutiveFailures = 0;

const SMOOTHING = 0.4;
const BOX_SMOOTHING = 0.3;
const LANE_LEFT = 0.35;
const LANE_RIGHT = 0.65;

/**
 * Enhanced skin detection using YCbCr color space
 * This is the most reliable method for skin detection across different lighting
 */
function isSkin(r: number, g: number, b: number): boolean {
  // Convert RGB to YCbCr
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  
  // Strict YCbCr skin range (research-backed values)
  const ycbcrSkin = (
    y > 80 && y < 230 &&
    cb > 77 && cb < 127 &&
    cr > 133 && cr < 173
  );
  
  // Additional RGB constraint for robustness
  const rgbConstraint = (
    r > 60 && g > 40 && b > 20 &&
    r > g && r > b &&
    r - g > 15 &&
    Math.max(r, g, b) - Math.min(r, g, b) > 15
  );
  
  return ycbcrSkin && rgbConstraint;
}

/**
 * Find face region using optimized skin detection and blob analysis
 */
function findFace(
  imageData: ImageData,
  width: number,
  height: number
): BoundingBox | null {
  const data = imageData.data;
  
  // Create binary skin mask with sampling
  const step = 3; // Sample every 3rd pixel for speed
  const gridW = Math.ceil(width / step);
  const gridH = Math.ceil(height / step);
  const skinGrid: boolean[][] = Array(gridH).fill(null).map(() => Array(gridW).fill(false));
  
  // Only search upper 55% of frame (face region)
  const searchTop = Math.floor(height * 0.02);
  const searchBottom = Math.floor(height * 0.55);
  
  let skinCount = 0;
  
  for (let gy = 0; gy < gridH; gy++) {
    const y = gy * step;
    if (y < searchTop || y >= searchBottom) continue;
    
    for (let gx = 0; gx < gridW; gx++) {
      const x = gx * step;
      const i = (y * width + x) * 4;
      
      if (isSkin(data[i], data[i + 1], data[i + 2])) {
        skinGrid[gy][gx] = true;
        skinCount++;
      }
    }
  }
  
  if (skinCount < 50) return null;
  
  // Find connected components using flood fill
  const visited: boolean[][] = Array(gridH).fill(null).map(() => Array(gridW).fill(false));
  const blobs: { pixels: [number, number][], minX: number, maxX: number, minY: number, maxY: number }[] = [];
  
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      if (skinGrid[gy][gx] && !visited[gy][gx]) {
        // Flood fill to find connected component
        const blob = floodFill(skinGrid, visited, gx, gy, gridW, gridH);
        if (blob.pixels.length > 30) { // Minimum blob size
          blobs.push(blob);
        }
      }
    }
  }
  
  if (blobs.length === 0) return null;
  
  // Score each blob to find the most face-like one
  let bestBlob = blobs[0];
  let bestScore = -Infinity;
  
  for (const blob of blobs) {
    const blobWidth = (blob.maxX - blob.minX) * step;
    const blobHeight = (blob.maxY - blob.minY) * step;
    
    if (blobWidth < 30 || blobHeight < 30) continue;
    
    const aspectRatio = blobWidth / blobHeight;
    const centerY = ((blob.minY + blob.maxY) / 2) * step;
    const centerX = ((blob.minX + blob.maxX) / 2) * step;
    
    // Face typically has aspect ratio between 0.6 and 1.0
    const aspectScore = (aspectRatio >= 0.55 && aspectRatio <= 1.1) ? 100 : 0;
    
    // Prefer blobs in upper-center area
    const positionScore = (1 - centerY / height) * 50;
    const horizontalScore = (1 - Math.abs(centerX / width - 0.5) * 2) * 30;
    
    // Prefer larger blobs (but not too large)
    const area = blob.pixels.length;
    const maxArea = (gridW * gridH) * 0.3;
    const sizeScore = Math.min(area / 100, 50) - (area > maxArea ? 100 : 0);
    
    // Compactness: real faces are fairly compact
    const expectedArea = blobWidth * blobHeight / (step * step);
    const density = blob.pixels.length / expectedArea;
    const compactnessScore = density > 0.4 ? 30 : 0;
    
    const totalScore = aspectScore + positionScore + horizontalScore + sizeScore + compactnessScore;
    
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestBlob = blob;
    }
  }
  
  if (bestScore < 50) return null;
  
  // Convert grid coordinates back to pixel coordinates
  const padding = 10;
  return {
    x: Math.max(0, bestBlob.minX * step - padding),
    y: Math.max(0, bestBlob.minY * step - padding),
    width: Math.min(width, (bestBlob.maxX - bestBlob.minX) * step + padding * 2),
    height: Math.min(height, (bestBlob.maxY - bestBlob.minY) * step + padding * 2)
  };
}

/**
 * Flood fill to find connected component
 */
function floodFill(
  grid: boolean[][],
  visited: boolean[][],
  startX: number,
  startY: number,
  gridW: number,
  gridH: number
): { pixels: [number, number][], minX: number, maxX: number, minY: number, maxY: number } {
  const pixels: [number, number][] = [];
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  
  const stack: [number, number][] = [[startX, startY]];
  
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    
    if (x < 0 || x >= gridW || y < 0 || y >= gridH) continue;
    if (visited[y][x] || !grid[y][x]) continue;
    
    visited[y][x] = true;
    pixels.push([x, y]);
    
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    
    // 4-connected neighbors
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    
    // Limit to prevent stack overflow
    if (pixels.length > 5000) break;
  }
  
  return { pixels, minX, maxX, minY, maxY };
}

/**
 * Smooth bounding box transitions
 */
function smoothBox(newBox: BoundingBox | null): BoundingBox | null {
  if (!newBox) {
    consecutiveFailures++;
    if (consecutiveFailures > 5) {
      smoothedBox = null;
    }
    return smoothedBox;
  }
  
  consecutiveFailures = 0;
  
  if (!smoothedBox) {
    smoothedBox = { ...newBox };
    return smoothedBox;
  }
  
  // Smooth each property
  smoothedBox = {
    x: smoothedBox.x + (newBox.x - smoothedBox.x) * BOX_SMOOTHING,
    y: smoothedBox.y + (newBox.y - smoothedBox.y) * BOX_SMOOTHING,
    width: smoothedBox.width + (newBox.width - smoothedBox.width) * BOX_SMOOTHING,
    height: smoothedBox.height + (newBox.height - smoothedBox.height) * BOX_SMOOTHING
  };
  
  return smoothedBox;
}

/**
 * Main tracking function
 */
export async function trackPlayer(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  config: TrackingConfig
): Promise<TrackingResult> {
  const { canvasWidth, canvasHeight } = config;
  frameCount++;
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Draw mirrored video
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvasWidth, 0, canvasWidth, canvasHeight);
  ctx.restore();
  
  // Get image data for processing
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  
  // Find face
  const rawBox = findFace(imageData, canvasWidth, canvasHeight);
  const boundingBox = smoothBox(rawBox);
  
  let detectedX = 0.5;
  let confidence = 0;
  let detectionMethod: TrackingResult['detectionMethod'] = 'none';
  
  if (boundingBox) {
    detectedX = (boundingBox.x + boundingBox.width / 2) / canvasWidth;
    confidence = rawBox ? 0.9 : 0.6;
    detectionMethod = 'face';
  }
  
  // Smooth position
  if (confidence > 0.3) {
    smoothedX = smoothedX * (1 - SMOOTHING) + detectedX * SMOOTHING;
  }
  
  // Determine lane
  let lane: number;
  if (smoothedX < LANE_LEFT) {
    lane = 0;
  } else if (smoothedX > LANE_RIGHT) {
    lane = 2;
  } else {
    lane = 1;
  }
  
  return {
    lane,
    confidence,
    x: smoothedX,
    boundingBox,
    detectionMethod
  };
}

/**
 * Draw tracking overlay - disabled for cleaner look
 */
export function drawTrackingOverlay(
  ctx: CanvasRenderingContext2D,
  result: TrackingResult,
  canvasWidth: number,
  canvasHeight: number
): void {
  // Bounding box hidden for cleaner gameplay
  return;
}

/**
 * Reset state
 */
export function resetTracking(): void {
  smoothedX = 0.5;
  smoothedBox = null;
  frameCount = 0;
  consecutiveFailures = 0;
}
