// lib/services/pose-detection-service.ts
// Simplified pose detection using body center tracking

export interface PosePosition {
  lane: number; // 0 = left, 1 = center, 2 = right
  confidence: number;
  x: number; // normalized 0-1
}

export interface PoseDetectionConfig {
  canvasWidth: number;
  canvasHeight: number;
  detectionThreshold?: number;
}

// Frame difference buffer for motion detection
let previousFrameData: Uint8ClampedArray | null = null;
let smoothedPosition = 0.5; // Start in center
const SMOOTHING_FACTOR = 0.3; // How quickly to respond to movement

/**
 * Detect player position based on frame difference motion detection
 * This is a lightweight approach that works without ML models
 */
export function detectPlayerPositionSimple(
  ctx: CanvasRenderingContext2D,
  config: PoseDetectionConfig
): PosePosition {
  const { canvasWidth, canvasHeight } = config;
  
  // Get current frame data
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const currentData = imageData.data;
  
  if (!previousFrameData) {
    previousFrameData = new Uint8ClampedArray(currentData);
    return { lane: 1, confidence: 0, x: 0.5 };
  }
  
  // Calculate motion in each third of the frame
  const zoneWidth = Math.floor(canvasWidth / 3);
  const motionScores = [0, 0, 0];
  const zoneCounts = [0, 0, 0];
  
  // Only analyze the middle portion vertically (where the body is)
  const startY = Math.floor(canvasHeight * 0.2);
  const endY = Math.floor(canvasHeight * 0.8);
  const sampleStep = 4; // Sample every 4th pixel for performance
  
  for (let y = startY; y < endY; y += sampleStep) {
    for (let x = 0; x < canvasWidth; x += sampleStep) {
      const i = (y * canvasWidth + x) * 4;
      const zone = Math.min(2, Math.floor(x / zoneWidth));
      
      // Calculate brightness difference
      const currentBrightness = (currentData[i] + currentData[i + 1] + currentData[i + 2]) / 3;
      const previousBrightness = (previousFrameData[i] + previousFrameData[i + 1] + previousFrameData[i + 2]) / 3;
      const diff = Math.abs(currentBrightness - previousBrightness);
      
      if (diff > 20) { // Motion threshold
        motionScores[zone] += diff;
      }
      zoneCounts[zone]++;
    }
  }
  
  // Normalize motion scores
  const normalizedScores = motionScores.map((score, i) => 
    zoneCounts[i] > 0 ? score / zoneCounts[i] : 0
  );
  
  // Find center of mass of motion
  const totalMotion = normalizedScores.reduce((a, b) => a + b, 0);
  let motionCenterX = 0.5;
  
  if (totalMotion > 0) {
    // Calculate weighted center
    motionCenterX = (
      normalizedScores[0] * 0.167 + // Left zone center
      normalizedScores[1] * 0.5 +   // Center zone center
      normalizedScores[2] * 0.833   // Right zone center
    ) / totalMotion;
    
    // Apply smoothing
    smoothedPosition = smoothedPosition * (1 - SMOOTHING_FACTOR) + motionCenterX * SMOOTHING_FACTOR;
  }
  
  // Store current frame for next comparison
  previousFrameData = new Uint8ClampedArray(currentData);
  
  // Convert position to lane
  let lane: number;
  if (smoothedPosition < 0.33) {
    lane = 0; // Left
  } else if (smoothedPosition > 0.67) {
    lane = 2; // Right
  } else {
    lane = 1; // Center
  }
  
  return {
    lane,
    confidence: Math.min(1, totalMotion / 1000),
    x: smoothedPosition,
  };
}

/**
 * Alternative: Detect position based on brightness distribution
 * Works by finding where the person (darker region) is
 */
export function detectPlayerPositionByBrightness(
  ctx: CanvasRenderingContext2D,
  config: PoseDetectionConfig
): PosePosition {
  const { canvasWidth, canvasHeight } = config;
  
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;
  
  // Calculate brightness distribution across zones
  const zoneWidth = Math.floor(canvasWidth / 3);
  const zoneBrightness = [0, 0, 0];
  const zoneCounts = [0, 0, 0];
  
  const startY = Math.floor(canvasHeight * 0.2);
  const endY = Math.floor(canvasHeight * 0.9);
  const sampleStep = 6;
  
  for (let y = startY; y < endY; y += sampleStep) {
    for (let x = 0; x < canvasWidth; x += sampleStep) {
      const i = (y * canvasWidth + x) * 4;
      const zone = Math.min(2, Math.floor(x / zoneWidth));
      
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      zoneBrightness[zone] += brightness;
      zoneCounts[zone]++;
    }
  }
  
  // Calculate average brightness per zone
  const avgBrightness = zoneBrightness.map((b, i) => 
    zoneCounts[i] > 0 ? b / zoneCounts[i] : 255
  );
  
  // The zone with the lowest brightness is where the person is
  // (assuming person is darker than background)
  let minBrightness = avgBrightness[0];
  let darkestZone = 0;
  
  for (let i = 1; i < 3; i++) {
    if (avgBrightness[i] < minBrightness) {
      minBrightness = avgBrightness[i];
      darkestZone = i;
    }
  }
  
  // Calculate weighted position based on brightness distribution
  const totalBrightness = avgBrightness.reduce((a, b) => a + b, 0);
  const invertedBrightness = avgBrightness.map(b => totalBrightness / 3 - (b - totalBrightness / 3));
  const totalInverted = invertedBrightness.reduce((a, b) => a + b, 0);
  
  let weightedX = 0.5;
  if (totalInverted > 0) {
    weightedX = (
      invertedBrightness[0] * 0.167 +
      invertedBrightness[1] * 0.5 +
      invertedBrightness[2] * 0.833
    ) / totalInverted;
  }
  
  // Apply smoothing
  smoothedPosition = smoothedPosition * 0.7 + weightedX * 0.3;
  
  // Convert to lane
  let lane: number;
  if (smoothedPosition < 0.35) {
    lane = 0;
  } else if (smoothedPosition > 0.65) {
    lane = 2;
  } else {
    lane = 1;
  }
  
  // Calculate confidence based on brightness difference between zones
  const maxDiff = Math.max(...avgBrightness) - Math.min(...avgBrightness);
  const confidence = Math.min(1, maxDiff / 50);
  
  return {
    lane,
    confidence,
    x: smoothedPosition,
  };
}

/**
 * Reset the pose detection state
 */
export function resetPoseDetection(): void {
  previousFrameData = null;
  smoothedPosition = 0.5;
}

/**
 * Hybrid detection combining motion and brightness
 */
export function detectPlayerPositionHybrid(
  ctx: CanvasRenderingContext2D,
  config: PoseDetectionConfig
): PosePosition {
  const motionResult = detectPlayerPositionSimple(ctx, config);
  const brightnessResult = detectPlayerPositionByBrightness(ctx, config);
  
  // Weighted combination based on confidence
  const totalConfidence = motionResult.confidence + brightnessResult.confidence;
  
  if (totalConfidence === 0) {
    return { lane: 1, confidence: 0, x: 0.5 };
  }
  
  const combinedX = (
    motionResult.x * motionResult.confidence +
    brightnessResult.x * brightnessResult.confidence
  ) / totalConfidence;
  
  // Convert to lane
  let lane: number;
  if (combinedX < 0.35) {
    lane = 0;
  } else if (combinedX > 0.65) {
    lane = 2;
  } else {
    lane = 1;
  }
  
  return {
    lane,
    confidence: Math.min(1, totalConfidence / 2),
    x: combinedX,
  };
}
