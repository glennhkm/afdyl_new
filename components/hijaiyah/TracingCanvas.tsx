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
    const strokeWidth = 86;

    // ── Cached offscreen canvases (avoid GC pressure during drawing) ──
    const strokeMaskRef = useRef<HTMLCanvasElement | null>(null);
    const staticCacheRef = useRef<{
      key: string;
      overlay: HTMLCanvasElement;
      shadow: HTMLCanvasElement;
    } | null>(null);

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

      // Invalidate static cache when letter changes
      staticCacheRef.current = null;
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

    // Draw canvas — stencil / groove effect
    const drawCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { width: w, height: h } = canvasSize;
      const hasImage = !!backgroundImage;

      // ── Calculate letter positioning ──
      let sw = 0, sh = 0, ox = 0, oy = 0;

      if (hasImage) {
        if (letterData) {
          const { viewBox } = letterData;
          const scaleX = w / viewBox.width;
          const scaleY = h / viewBox.height;
          const scale = Math.min(scaleX, scaleY);
          sw = viewBox.width * scale;
          sh = viewBox.height * scale;
          ox = (w - sw) / 2;
          oy = (h - sh) / 2;
        } else {
          const imgAspect = backgroundImage!.width / backgroundImage!.height;
          const canvasAspect = w / h;
          const padding = 40;
          const availW = w - padding * 2;
          const availH = h - padding * 2;
          if (imgAspect > canvasAspect) {
            sw = availW;
            sh = availW / imgAspect;
          } else {
            sh = availH;
            sw = availH * imgAspect;
          }
          ox = (w - sw) / 2;
          oy = (h - sh) / 2;
        }
      }

      // ── Build / cache static layers (overlay + inner shadow) ──
      // These only change when the letter or canvas size changes, NOT per stroke.
      let overlay: HTMLCanvasElement | null = null;
      let shadow: HTMLCanvasElement | null = null;

      if (hasImage) {
        const cacheKey = `${w}_${h}_${backgroundImage!.src}`;

        if (staticCacheRef.current?.key === cacheKey) {
          overlay = staticCacheRef.current.overlay;
          shadow = staticCacheRef.current.shadow;
        } else {
          // ── Raised overlay (elevated surface around the groove) ──
          overlay = document.createElement("canvas");
          overlay.width = w;
          overlay.height = h;
          const oCtx = overlay.getContext("2d")!;
          oCtx.fillStyle = "#EAECDA"; // raised surface (lighter)
          oCtx.fillRect(0, 0, w, h);
          // Cut out the letter groove (destination-out removes where letter has alpha)
          oCtx.globalCompositeOperation = "destination-out";
          oCtx.drawImage(backgroundImage!, ox, oy, sw, sh);

          // ── Inner shadow (depth cue at groove edges) ──
          // 1. Create a "frame" = black everywhere, transparent letter hole
          const frame = document.createElement("canvas");
          frame.width = w;
          frame.height = h;
          const fCtx = frame.getContext("2d")!;
          fCtx.fillStyle = "#000000";
          fCtx.fillRect(0, 0, w, h);
          fCtx.globalCompositeOperation = "destination-out";
          fCtx.drawImage(backgroundImage!, ox, oy, sw, sh);

          // 2. Draw the blurred frame clipped to the letter area only
          //    → black fades inward from groove edges = inner shadow
          shadow = document.createElement("canvas");
          shadow.width = w;
          shadow.height = h;
          const sCtx = shadow.getContext("2d")!;
          sCtx.drawImage(backgroundImage!, ox, oy, sw, sh); // letter as clip mask
          sCtx.globalCompositeOperation = "source-atop";
          sCtx.filter = "blur(5px)";
          sCtx.drawImage(frame, 0, 0);
          sCtx.filter = "none";

          staticCacheRef.current = { key: cacheKey, overlay, shadow };
        }
      }

      // ═══════════════════════════════════════════
      //  DRAW PIPELINE
      // ═══════════════════════════════════════════

      // ── STEP 1: Groove floor (recessed channel base color) ──
      ctx.fillStyle = "#D6D8C2";
      ctx.fillRect(0, 0, w, h);

      // ── STEP 2: Letter guide image in the groove (subtle) ──
      if (hasImage) {
        ctx.globalAlpha = 0.35;
        ctx.drawImage(backgroundImage!, ox, oy, sw, sh);
        ctx.globalAlpha = 1;
      }

      // ── STEP 3: User strokes MASKED to letter groove ──
      // Uses compositing: draw letter shape → source-atop → draw strokes
      // Result: strokes only visible where the letter has alpha (the groove)
      if (hasImage) {
        // Re-use or create the stroke mask canvas
        let tmp = strokeMaskRef.current;
        if (!tmp || tmp.width !== w || tmp.height !== h) {
          tmp = document.createElement("canvas");
          tmp.width = w;
          tmp.height = h;
          strokeMaskRef.current = tmp;
        }
        const tCtx = tmp.getContext("2d")!;
        tCtx.clearRect(0, 0, w, h);

        // Letter shape as the alpha mask
        tCtx.globalCompositeOperation = "source-over";
        tCtx.drawImage(backgroundImage!, ox, oy, sw, sh);

        // source-atop: subsequent draws only appear where destination has alpha
        tCtx.globalCompositeOperation = "source-atop";

        // Helper: draw a single trace
        const drawTrace = (trace: Point[], color: string) => {
          if (trace.length < 2) return;
          tCtx.strokeStyle = color;
          tCtx.lineWidth = strokeWidth;
          tCtx.lineCap = "round";
          tCtx.lineJoin = "round";
          tCtx.beginPath();
          tCtx.moveTo(trace[0].x, trace[0].y);
          for (let i = 1; i < trace.length; i++) {
            tCtx.lineTo(trace[i].x, trace[i].y);
          }
          tCtx.stroke();
        };

        // Draw all saved traces
        allTraces.forEach((trace, i) =>
          drawTrace(trace, validatedTraces[i] ? "#16a34a" : "#1A1A1A")
        );
        // Draw the current in-progress trace
        drawTrace(currentTrace, "#1A1A1A");

        // Composite masked strokes onto main canvas
        tCtx.globalCompositeOperation = "source-over";
        ctx.drawImage(tmp, 0, 0);
      } else {
        // Fallback: no image loaded yet — draw strokes directly (no masking)
        const drawTrace = (trace: Point[], color: string) => {
          if (trace.length < 2) return;
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(trace[0].x, trace[0].y);
          for (let i = 1; i < trace.length; i++) {
            ctx.lineTo(trace[i].x, trace[i].y);
          }
          ctx.stroke();
        };

        allTraces.forEach((trace, i) =>
          drawTrace(trace, validatedTraces[i] ? "#16a34a" : "#1A1A1A")
        );
        drawTrace(currentTrace, "#1A1A1A");
      }

      // ── STEP 4: Raised overlay (elevated surface around the groove) ──
      if (overlay) {
        ctx.drawImage(overlay, 0, 0);
      }

      // ── STEP 5: Inner shadow (subtle depth cue at groove edges) ──
      if (shadow) {
        ctx.globalAlpha = 0.15;
        ctx.drawImage(shadow, 0, 0);
        ctx.globalAlpha = 1;
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
        className={`w-full mx-auto rounded-2xl overflow-hidden flex justify-center items-center ${
          isCompleted
            ? "ring-4 ring-green-500 ring-opacity-50 shadow-lg"
            : "shadow-[inset_0_2px_6px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.1)]"
        }`}
        style={{
          touchAction: "none",
          background: "#EAECDA", // matches the raised overlay surface color
        }}
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
