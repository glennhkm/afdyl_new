"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Point,
  SVGLetterData,
  parseSvgLetter,
  calculateCoverage,
} from "@/lib/services/svg-tracing-service";
import { getPngPath } from "@/lib/data/hijaiyah-letters";

interface TracingCanvasProps {
  letter: string;
  onTracingUpdate?: (data: {
    coverage: number;
    isComplete: boolean;
    allTraces: Point[][];
  }) => void;
  isCompleted?: boolean;
}

export interface TracingCanvasRef {
  resetTracing: () => void;
  validateTracing: () => { isValid: boolean; coverage: number; message: string };
}

const TracingCanvas = forwardRef<TracingCanvasRef, TracingCanvasProps>(
  ({ letter, onTracingUpdate, isCompleted = false }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [letterData, setLetterData] = useState<SVGLetterData | null>(null);
    const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
    const [isTracing, setIsTracing] = useState(false);
    const [currentTrace, setCurrentTrace] = useState<Point[]>([]);
    const [allTraces, setAllTraces] = useState<Point[][]>([]);
    const [validatedTraces, setValidatedTraces] = useState<Record<number, boolean>>({});
    const [canvasSize, setCanvasSize] = useState({ width: 350, height: 350 });
    const strokeWidth = 36;

    // Load letter data and background image
    useEffect(() => {
      const loadData = async () => {
        const data = await parseSvgLetter(letter);
        setLetterData(data);

        // Load background PNG
        const pngPath = getPngPath(letter);
        if (pngPath) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => setBackgroundImage(img);
          img.src = pngPath;
        }
      };

      loadData();
    }, [letter]);

    // Set canvas size based on container
    useEffect(() => {
      const updateSize = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const size = Math.min(rect.width, 400);
          setCanvasSize({ width: size, height: size });
        }
      };

      updateSize();
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }, []);

    // Draw canvas
    const drawCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.fillStyle = "#E7E9D1"; // foreground-2 color from globals.css
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw background image (semi-transparent)
      if (backgroundImage) {
        // Calculate scaling to fit the image properly
        const imgAspect = backgroundImage.width / backgroundImage.height;
        const canvasAspect = canvasSize.width / canvasSize.height;
        
        let scaledWidth: number, scaledHeight: number;
        let offsetX: number, offsetY: number;

        if (letterData) {
          // Use SVG viewBox for positioning if available
          const { viewBox } = letterData;
          const scaleX = canvasSize.width / viewBox.width;
          const scaleY = canvasSize.height / viewBox.height;
          const scale = Math.min(scaleX, scaleY);

          scaledWidth = viewBox.width * scale;
          scaledHeight = viewBox.height * scale;
          offsetX = (canvasSize.width - scaledWidth) / 2;
          offsetY = (canvasSize.height - scaledHeight) / 2;
        } else {
          // Fallback to image dimensions with padding
          const padding = 40;
          const availableWidth = canvasSize.width - padding * 2;
          const availableHeight = canvasSize.height - padding * 2;
          
          if (imgAspect > canvasAspect) {
            scaledWidth = availableWidth;
            scaledHeight = availableWidth / imgAspect;
          } else {
            scaledHeight = availableHeight;
            scaledWidth = availableHeight * imgAspect;
          }
          
          offsetX = (canvasSize.width - scaledWidth) / 2;
          offsetY = (canvasSize.height - scaledHeight) / 2;
        }

        ctx.globalAlpha = 0.4;
        ctx.drawImage(
          backgroundImage,
          offsetX,
          offsetY,
          scaledWidth,
          scaledHeight
        );
        ctx.globalAlpha = 1;
      }

      // Draw all completed traces
      allTraces.forEach((trace, index) => {
        if (trace.length < 2) return;

        const isValidated = validatedTraces[index] || false;
        ctx.strokeStyle = isValidated ? "#16a34a" : "#1A1A1A"; // green or softBlack
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(trace[0].x, trace[0].y);
        for (let i = 1; i < trace.length; i++) {
          ctx.lineTo(trace[i].x, trace[i].y);
        }
        ctx.stroke();
      });

      // Draw current trace
      if (currentTrace.length >= 2) {
        ctx.strokeStyle = "#1A1A1A"; // softBlack
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(currentTrace[0].x, currentTrace[0].y);
        for (let i = 1; i < currentTrace.length; i++) {
          ctx.lineTo(currentTrace[i].x, currentTrace[i].y);
        }
        ctx.stroke();
      }
    }, [
      canvasSize,
      backgroundImage,
      letterData,
      allTraces,
      currentTrace,
      validatedTraces,
    ]);

    // Redraw when dependencies change
    useEffect(() => {
      drawCanvas();
    }, [drawCanvas]);

    // Get position from event (accounting for canvas scaling)
    const getPosition = (e: React.MouseEvent | React.TouchEvent): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Calculate scale factor between displayed size and actual canvas size
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    // Start tracing
    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const pos = getPosition(e);
      if (pos) {
        setCurrentTrace([pos]);
        setIsTracing(true);
      }
    };

    // Update tracing
    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isTracing) return;
      e.preventDefault();
      const pos = getPosition(e);
      if (pos) {
        setCurrentTrace((prev) => [...prev, pos]);
      }
    };

    // End tracing
    const handleEnd = () => {
      if (isTracing && currentTrace.length > 0) {
        setAllTraces((prev) => [...prev, currentTrace]);
        setCurrentTrace([]);
        setIsTracing(false);

        // Notify parent about update
        if (letterData && onTracingUpdate) {
          const coverage = calculateCoverage(
            letterData,
            [...allTraces, currentTrace],
            [],
            canvasSize,
            strokeWidth
          );
          onTracingUpdate({
            coverage,
            isComplete: coverage >= 1.0,
            allTraces: [...allTraces, currentTrace],
          });
        }
      }
    };

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      resetTracing: () => {
        setCurrentTrace([]);
        setAllTraces([]);
        setValidatedTraces({});
        setIsTracing(false);
      },
      validateTracing: () => {
        if (!letterData) {
          return {
            isValid: false,
            coverage: 0,
            message: "Data huruf belum dimuat.",
          };
        }

        if (allTraces.length === 0 && currentTrace.length === 0) {
          return {
            isValid: false,
            coverage: 0,
            message: "Silakan trace huruf terlebih dahulu.",
          };
        }

        const coverage = calculateCoverage(
          letterData,
          allTraces,
          currentTrace,
          canvasSize,
          strokeWidth
        );

        if (coverage >= 1.0) {
          // Mark all traces as validated
          const newValidated: Record<number, boolean> = {};
          for (let i = 0; i < allTraces.length; i++) {
            newValidated[i] = true;
          }
          setValidatedTraces(newValidated);

          return {
            isValid: true,
            coverage,
            message: "Sempurna! Huruf berhasil diselesaikan dengan benar.",
          };
        } else {
          let message = "Tracing belum lengkap. ";
          if (coverage < 0.3) {
            message += "Trace semua bagian huruf termasuk titik-titiknya.";
          } else if (coverage < 0.7) {
            message += "Hampir benar, lengkapi bagian yang terlewat.";
          } else {
            message += "Sedikit lagi, pastikan semua bagian ter-trace.";
          }

          return {
            isValid: false,
            coverage,
            message,
          };
        }
      },
    }));

    return (
      <div
        ref={containerRef}
        className={`w-full bg-foreground-2 mx-auto rounded-2xl overflow-hidden shadow-lg flex justify-center items-center ${
          isCompleted ? "ring-4 ring-green-500 ring-opacity-50" : ""
        }`}
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full max-w-100 h-auto cursor-crosshair"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>
    );
  }
);

TracingCanvas.displayName = "TracingCanvas";

export default TracingCanvas;
