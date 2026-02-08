// lib/services/svg-tracing-service.ts

import { getSvgPath } from '@/lib/data/hijaiyah-letters';

export interface Point {
  x: number;
  y: number;
}

export interface SVGPathPoint {
  position: Point;
  strokeOrder: number;
  isStartPoint: boolean;
  isEndPoint: boolean;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SVGLetterData {
  pathPoints: SVGPathPoint[];
  viewBox: ViewBox;
  svgContent: string;
}

export interface TracingState {
  currentTrace: Point[];
  allTraces: Point[][];
  validatedTraces: Record<number, boolean>;
  isTracing: boolean;
  letterData: SVGLetterData | null;
  canvasSize: { width: number; height: number } | null;
}

export interface TracingFeedback {
  type: 'letterCompleted' | 'strokeInvalid' | 'tracingReset' | 'tracingUpdated';
  message?: string;
  coverage?: number;
}

// Parse SVG viewBox attribute
function parseViewBox(viewBoxStr: string): ViewBox {
  const parts = viewBoxStr.split(/[\s,]+/).map(Number);
  return {
    x: parts[0] || 0,
    y: parts[1] || 0,
    width: parts[2] || 100,
    height: parts[3] || 100,
  };
}

// Parse SVG path d attribute and extract points
function extractPointsFromPath(pathData: string, strokeOrder: number, viewBox: ViewBox): SVGPathPoint[] {
  const points: SVGPathPoint[] = [];
  
  // Simple path parser for M, L, C, Q commands
  const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
  
  let currentX = 0;
  let currentY = 0;
  let isFirst = true;
  
  for (const cmd of commands) {
    const type = cmd[0].toUpperCase();
    const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    switch (type) {
      case 'M': // Move to
        if (nums.length >= 2) {
          currentX = nums[0];
          currentY = nums[1];
          points.push({
            position: { x: currentX / viewBox.width, y: currentY / viewBox.height },
            strokeOrder,
            isStartPoint: isFirst,
            isEndPoint: false,
          });
          isFirst = false;
        }
        break;
        
      case 'L': // Line to
        for (let i = 0; i < nums.length; i += 2) {
          if (i + 1 < nums.length) {
            currentX = nums[i];
            currentY = nums[i + 1];
            points.push({
              position: { x: currentX / viewBox.width, y: currentY / viewBox.height },
              strokeOrder,
              isStartPoint: false,
              isEndPoint: false,
            });
          }
        }
        break;
        
      case 'H': // Horizontal line
        for (const num of nums) {
          currentX = num;
          points.push({
            position: { x: currentX / viewBox.width, y: currentY / viewBox.height },
            strokeOrder,
            isStartPoint: false,
            isEndPoint: false,
          });
        }
        break;
        
      case 'V': // Vertical line
        for (const num of nums) {
          currentY = num;
          points.push({
            position: { x: currentX / viewBox.width, y: currentY / viewBox.height },
            strokeOrder,
            isStartPoint: false,
            isEndPoint: false,
          });
        }
        break;
        
      case 'C': // Cubic bezier
        for (let i = 0; i < nums.length; i += 6) {
          if (i + 5 < nums.length) {
            // Add intermediate points for better coverage
            for (let t = 0.25; t <= 1; t += 0.25) {
              const x = cubicBezier(currentX, nums[i], nums[i+2], nums[i+4], t);
              const y = cubicBezier(currentY, nums[i+1], nums[i+3], nums[i+5], t);
              points.push({
                position: { x: x / viewBox.width, y: y / viewBox.height },
                strokeOrder,
                isStartPoint: false,
                isEndPoint: false,
              });
            }
            currentX = nums[i+4];
            currentY = nums[i+5];
          }
        }
        break;
        
      case 'Q': // Quadratic bezier
        for (let i = 0; i < nums.length; i += 4) {
          if (i + 3 < nums.length) {
            for (let t = 0.25; t <= 1; t += 0.25) {
              const x = quadraticBezier(currentX, nums[i], nums[i+2], t);
              const y = quadraticBezier(currentY, nums[i+1], nums[i+3], t);
              points.push({
                position: { x: x / viewBox.width, y: y / viewBox.height },
                strokeOrder,
                isStartPoint: false,
                isEndPoint: false,
              });
            }
            currentX = nums[i+2];
            currentY = nums[i+3];
          }
        }
        break;
        
      case 'A': // Arc - simplified as line for tracing purposes
        for (let i = 0; i < nums.length; i += 7) {
          if (i + 6 < nums.length) {
            currentX = nums[i+5];
            currentY = nums[i+6];
            points.push({
              position: { x: currentX / viewBox.width, y: currentY / viewBox.height },
              strokeOrder,
              isStartPoint: false,
              isEndPoint: false,
            });
          }
        }
        break;
    }
  }
  
  // Mark last point as end point
  if (points.length > 0) {
    points[points.length - 1].isEndPoint = true;
  }
  
  return points;
}

// Cubic bezier interpolation
function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

// Quadratic bezier interpolation
function quadraticBezier(p0: number, p1: number, p2: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

// Parse SVG file and extract path data
export async function parseSvgLetter(letter: string): Promise<SVGLetterData | null> {
  const svgPath = getSvgPath(letter);
  if (!svgPath) return null;
  
  try {
    const response = await fetch(svgPath);
    if (!response.ok) return null;
    
    const svgContent = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    
    const svgElement = doc.querySelector('svg');
    if (!svgElement) return null;
    
    // Try to get viewBox, fallback to width/height
    let viewBox: ViewBox;
    const viewBoxStr = svgElement.getAttribute('viewBox');
    if (viewBoxStr) {
      viewBox = parseViewBox(viewBoxStr);
    } else {
      // Get width and height from SVG element
      const widthStr = svgElement.getAttribute('width') || '160';
      const heightStr = svgElement.getAttribute('height') || '160';
      const width = parseFloat(widthStr.replace('px', '')) || 160;
      const height = parseFloat(heightStr.replace('px', '')) || 160;
      viewBox = { x: 0, y: 0, width, height };
    }
    
    const allPoints: SVGPathPoint[] = [];
    let strokeOrder = 1;
    
    // Parse paths from <g> elements
    const gElements = doc.querySelectorAll('g');
    gElements.forEach((gElement) => {
      const pathElements = gElement.querySelectorAll('path');
      pathElements.forEach((pathElement) => {
        const pathData = pathElement.getAttribute('d');
        if (pathData) {
          const points = extractPointsFromPath(pathData, strokeOrder, viewBox);
          allPoints.push(...points);
        }
      });
      if (gElement.querySelectorAll('path').length > 0) {
        strokeOrder++;
      }
    });
    
    // Also parse standalone path elements
    const standalonePathElements = doc.querySelectorAll('svg > path');
    standalonePathElements.forEach((pathElement) => {
      const pathData = pathElement.getAttribute('d');
      if (pathData) {
        const points = extractPointsFromPath(pathData, strokeOrder, viewBox);
        allPoints.push(...points);
        strokeOrder++;
      }
    });
    
    // Parse circle elements (for dots)
    const circleElements = doc.querySelectorAll('circle');
    circleElements.forEach((circleElement) => {
      const cx = parseFloat(circleElement.getAttribute('cx') || '0');
      const cy = parseFloat(circleElement.getAttribute('cy') || '0');
      const r = parseFloat(circleElement.getAttribute('r') || '5');
      
      // Add points around the circle for tracing
      for (let angle = 0; angle < 360; angle += 45) {
        const rad = (angle * Math.PI) / 180;
        const x = cx + r * Math.cos(rad);
        const y = cy + r * Math.sin(rad);
        allPoints.push({
          position: { x: x / viewBox.width, y: y / viewBox.height },
          strokeOrder,
          isStartPoint: angle === 0,
          isEndPoint: angle === 315,
        });
      }
      strokeOrder++;
    });
    
    return {
      pathPoints: allPoints,
      viewBox,
      svgContent,
    };
  } catch (error) {
    console.error('Error parsing SVG:', error);
    return null;
  }
}

// Calculate coverage percentage
export function calculateCoverage(
  letterData: SVGLetterData,
  allTraces: Point[][],
  currentTrace: Point[],
  canvasSize: { width: number; height: number },
  strokeWidth: number = 36
): number {
  const combinedTrace: Point[] = [...allTraces.flat(), ...currentTrace];
  
  if (combinedTrace.length < 5) return 0;
  
  const { viewBox, pathPoints } = letterData;
  
  // Calculate scale and offset (same as rendering)
  const scaleX = canvasSize.width / viewBox.width;
  const scaleY = canvasSize.height / viewBox.height;
  const scale = Math.min(scaleX, scaleY);
  
  const offsetX = (canvasSize.width - viewBox.width * scale) / 2;
  const offsetY = (canvasSize.height - viewBox.height * scale) / 2;
  
  // Convert normalized coordinates to canvas coordinates
  const canvasTargetPoints = pathPoints.map(point => ({
    x: point.position.x * viewBox.width * scale + offsetX,
    y: point.position.y * viewBox.height * scale + offsetY,
  }));
  
  // Calculate coverage
  const coverageRadius = strokeWidth;
  let coveredPoints = 0;
  
  for (const targetPoint of canvasTargetPoints) {
    let pointCovered = false;
    
    for (const tracePoint of combinedTrace) {
      const distance = Math.sqrt(
        Math.pow(tracePoint.x - targetPoint.x, 2) +
        Math.pow(tracePoint.y - targetPoint.y, 2)
      );
      
      if (distance <= coverageRadius) {
        pointCovered = true;
        break;
      }
    }
    
    if (pointCovered) {
      coveredPoints++;
    }
  }
  
  return canvasTargetPoints.length > 0 ? coveredPoints / canvasTargetPoints.length : 0;
}

// Create initial tracing state
export function createInitialState(): TracingState {
  return {
    currentTrace: [],
    allTraces: [],
    validatedTraces: {},
    isTracing: false,
    letterData: null,
    canvasSize: null,
  };
}
