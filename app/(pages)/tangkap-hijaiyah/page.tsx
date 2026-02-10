"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/topbar";
import Icon from "@/components/Icon";
import { hijaiyahGameLetters, shuffleArray } from "@/lib/data/hijaiyah-game-data";
import { 
  trackPlayer, 
  drawTrackingOverlay, 
  resetTracking,
  TrackingResult 
} from "@/lib/services/face-tracking-service-v2";

// ============================================
// GAME CONFIGURATION
// ============================================
const GAME_CONFIG = {
  LANES: 3,
  INITIAL_FALL_SPEED: 3,
  SPEED_INCREMENT: 0.5,
  LETTER_SIZE: 80,
  SPAWN_INTERVAL_INITIAL: 2200,
  SPAWN_INTERVAL_MIN: 1200,
  CATCH_ZONE_HEIGHT: 100,
  LIVES: 3,
  LETTERS_PER_LEVEL: 5,
  POINTS_PER_CATCH: 10,
  COMBO_MULTIPLIER: 1.5,
} as const;

// Lane colors - matched to project theme
const LANE_COLORS = ["#BE9D77", "#E37100", "#EDDD6E"]; // brown-brand, tertiary-orange, secondary-gold
const LANE_LABELS = ["Kiri", "Tengah", "Kanan"];

// ============================================
// TYPES
// ============================================
interface FallingLetter {
  id: string;
  letter: string;
  name: string;
  audio: string;
  lane: number;
  y: number;
  speed: number;
  caught: boolean;
  missed: boolean;
}

interface GameState {
  status: "menu" | "countdown" | "playing" | "paused" | "gameover";
  score: number;
  lives: number;
  level: number;
  lettersCaught: number;
  combo: number;
  highScore: number;
}

interface CatchEffect {
  id: string;
  lane: number;
  success: boolean;
  letter: string;
}

// ============================================
// HELPER COMPONENTS
// ============================================
const LivesDisplay = React.memo(({ lives, maxLives }: { lives: number; maxLives: number }) => (
  <div className="flex gap-1">
    {Array.from({ length: maxLives }).map((_, i) => (
      <Icon
        key={i}
        name={i < lives ? "RiHeartFill" : "RiHeartLine"}
        className={`w-5 h-5 sm:w-6 sm:h-6 ${i < lives ? "text-red-500" : "text-gray-500"}`}
      />
    ))}
  </div>
));
LivesDisplay.displayName = "LivesDisplay";

const ScoreDisplay = React.memo(({ score, level, combo }: { score: number; level: number; combo: number }) => (
  <div className="text-left">
    <div className="text-white font-bold text-xl sm:text-2xl">{score}</div>
    <div className="text-white/80 text-xs flex items-center gap-2">
      <span>Level {level}</span>
      {combo > 1 && (
        <span className="bg-[#E37100] text-white px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse">
          x{combo}
        </span>
      )}
    </div>
  </div>
));
ScoreDisplay.displayName = "ScoreDisplay";

const CatchEffectComponent = React.memo(({ effect }: { effect: CatchEffect }) => (
  <div
    className={`absolute bottom-24 z-20 pointer-events-none animate-bounce-up
      ${effect.lane === 0 ? "left-[16.67%] -translate-x-1/2" : ""}
      ${effect.lane === 1 ? "left-1/2 -translate-x-1/2" : ""}
      ${effect.lane === 2 ? "left-[83.33%] -translate-x-1/2" : ""}
    `}
  >
    <div className={`text-4xl font-bold drop-shadow-lg ${effect.success ? "text-[#14AE5C]" : "text-red-500"}`}>
      {effect.success ? `+${GAME_CONFIG.POINTS_PER_CATCH}` : "Miss!"}
    </div>
  </div>
));
CatchEffectComponent.displayName = "CatchEffectComponent";

// ============================================
// MAIN GAME COMPONENT
// ============================================
const TangkapHijaiyahGame = () => {
  const router = useRouter();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  
  // Letter queue
  const lettersQueueRef = useRef<typeof hijaiyahGameLetters>([]);
  const letterIndexRef = useRef(0);
  const lastLaneRef = useRef(-1);
  
  // State
  const [gameState, setGameState] = useState<GameState>({
    status: "menu",
    score: 0,
    lives: GAME_CONFIG.LIVES,
    level: 1,
    lettersCaught: 0,
    combo: 0,
    highScore: 0,
  });
  
  const [fallingLetters, setFallingLetters] = useState<FallingLetter[]>([]);
  const [playerLane, setPlayerLane] = useState(1);
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentLetterName, setCurrentLetterName] = useState("");
  const [catchEffects, setCatchEffects] = useState<CatchEffect[]>([]);
  const [gameHeight, setGameHeight] = useState(600);
  
  // Overlay canvas ref for drawing tracking visualization
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem("tangkap_hijaiyah_highscore");
    if (saved) {
      setGameState(prev => ({ ...prev, highScore: parseInt(saved) }));
    }
  }, []);

  // Update game height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (gameContainerRef.current) {
        setGameHeight(gameContainerRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Save high score
  const saveHighScore = useCallback((score: number) => {
    const current = parseInt(localStorage.getItem("tangkap_hijaiyah_highscore") || "0");
    if (score > current) {
      localStorage.setItem("tangkap_hijaiyah_highscore", score.toString());
      setGameState(prev => ({ ...prev, highScore: score }));
    }
  }, []);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
      }
      
      setCameraError(null);
      resetTracking();
      return true;
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
      return false;
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Play audio
  const playAudio = useCallback((audioFile: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      audioRef.current = new Audio(`/audio/${audioFile}`);
      audioRef.current.volume = 0.8;
      audioRef.current.play().catch(() => {});
    } catch (e) {
      console.error("Audio error:", e);
    }
  }, []);

  // Spawn letter
  const spawnLetter = useCallback(() => {
    if (lettersQueueRef.current.length === 0) {
      lettersQueueRef.current = shuffleArray([...hijaiyahGameLetters]);
      letterIndexRef.current = 0;
    }
    
    const letterData = lettersQueueRef.current[letterIndexRef.current];
    letterIndexRef.current = (letterIndexRef.current + 1) % lettersQueueRef.current.length;
    
    // Avoid same lane twice in a row
    let lane = Math.floor(Math.random() * GAME_CONFIG.LANES);
    if (lane === lastLaneRef.current) {
      lane = (lane + 1 + Math.floor(Math.random() * 2)) % GAME_CONFIG.LANES;
    }
    lastLaneRef.current = lane;
    
    const speed = GAME_CONFIG.INITIAL_FALL_SPEED + 
      (gameState.level - 1) * GAME_CONFIG.SPEED_INCREMENT;
    
    const newLetter: FallingLetter = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      letter: letterData.letter,
      name: letterData.name,
      audio: letterData.audio,
      lane,
      y: -GAME_CONFIG.LETTER_SIZE,
      speed,
      caught: false,
      missed: false,
    };
    
    setFallingLetters(prev => [...prev, newLetter]);
    setCurrentLetterName(letterData.name.charAt(0).toUpperCase() + letterData.name.slice(1));
    playAudio(letterData.audio);
  }, [gameState.level, playAudio]);

  // Detect player position with advanced tracking
  const detectPosition = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx || video.readyState !== 4) return;
    
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    
    // Track player using advanced detection
    const result = await trackPlayer(video, canvas, ctx, {
      canvasWidth: width,
      canvasHeight: height,
    });
    
    setTrackingResult(result);
    setPlayerLane(result.lane);
    
    // Draw tracking overlay on visible canvas
    if (overlayCanvasRef.current) {
      const overlayCtx = overlayCanvasRef.current.getContext("2d");
      if (overlayCtx) {
        overlayCanvasRef.current.width = width;
        overlayCanvasRef.current.height = height;
        overlayCtx.clearRect(0, 0, width, height);
        drawTrackingOverlay(overlayCtx, result, width, height);
      }
    }
  }, []);

  // Add catch effect
  const addCatchEffect = useCallback((lane: number, success: boolean, letter: string) => {
    const effect: CatchEffect = {
      id: `effect-${Date.now()}`,
      lane,
      success,
      letter,
    };
    setCatchEffects(prev => [...prev, effect]);
    setTimeout(() => {
      setCatchEffects(prev => prev.filter(e => e.id !== effect.id));
    }, 500);
  }, []);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (gameState.status !== "playing") return;
    
    // Detect player position
    detectPosition();
    
    // Spawn new letters
    const spawnInterval = Math.max(
      GAME_CONFIG.SPAWN_INTERVAL_MIN,
      GAME_CONFIG.SPAWN_INTERVAL_INITIAL - (gameState.level - 1) * 150
    );
    
    if (timestamp - lastSpawnTimeRef.current > spawnInterval) {
      spawnLetter();
      lastSpawnTimeRef.current = timestamp;
    }
    
    // Update letters
    const catchZoneTop = gameHeight - GAME_CONFIG.CATCH_ZONE_HEIGHT - 60;
    const catchZoneBottom = gameHeight - 60;
    
    setFallingLetters(prev => {
      let scoreToAdd = 0;
      let livesToRemove = 0;
      let caught = false;
      
      const updated = prev.map(letter => {
        if (letter.caught || letter.missed) return letter;
        
        const newY = letter.y + letter.speed;
        
        // Check catch zone
        const letterBottom = newY + GAME_CONFIG.LETTER_SIZE;
        
        if (letterBottom >= catchZoneTop && newY <= catchZoneBottom) {
          if (letter.lane === playerLane && !letter.caught) {
            // Caught!
            addCatchEffect(letter.lane, true, letter.letter);
            scoreToAdd += GAME_CONFIG.POINTS_PER_CATCH * (1 + gameState.combo * 0.1);
            caught = true;
            return { ...letter, y: newY, caught: true };
          }
        }
        
        // Check miss
        if (newY > catchZoneBottom + 20 && !letter.caught) {
          addCatchEffect(letter.lane, false, letter.letter);
          livesToRemove++;
          return { ...letter, missed: true };
        }
        
        return { ...letter, y: newY };
      });
      
      // Update game state
      if (scoreToAdd > 0 || livesToRemove > 0 || caught) {
        setGameState(prev => {
          const newLives = Math.max(0, prev.lives - livesToRemove);
          const newCombo = caught ? prev.combo + 1 : (livesToRemove > 0 ? 0 : prev.combo);
          const newLettersCaught = caught ? prev.lettersCaught + 1 : prev.lettersCaught;
          const newLevel = Math.floor(newLettersCaught / GAME_CONFIG.LETTERS_PER_LEVEL) + 1;
          
          if (newLives <= 0) {
            return { ...prev, lives: 0, status: "gameover", combo: newCombo };
          }
          
          return {
            ...prev,
            score: prev.score + Math.floor(scoreToAdd),
            lives: newLives,
            combo: newCombo,
            lettersCaught: newLettersCaught,
            level: newLevel,
          };
        });
      }
      
      // Clean up
      return updated.filter(l => !(l.caught && l.y > gameHeight) && !l.missed);
    });
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.status, gameState.level, gameState.combo, playerLane, gameHeight, detectPosition, spawnLetter, addCatchEffect]);

  // Start game
  const startGame = useCallback(async () => {
    const cameraReady = await initCamera();
    if (!cameraReady) return;
    
    setGameState(prev => ({
      ...prev,
      status: "countdown",
      score: 0,
      lives: GAME_CONFIG.LIVES,
      level: 1,
      lettersCaught: 0,
      combo: 0,
    }));
    
    setFallingLetters([]);
    setCatchEffects([]);
    setCountdown(3);
    resetTracking();
    
    // Use refs to avoid stale closure issues
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownInterval);
        setCountdown(0);
        setGameState(prev => ({ ...prev, status: "playing" }));
        lastSpawnTimeRef.current = performance.now();
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      }
    }, 1000);
    
    return () => clearInterval(countdownInterval);
  }, [initCamera, gameLoop]);

  // Toggle pause
  const togglePause = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: prev.status === "playing" ? "paused" : "playing",
    }));
  }, []);

  // End game
  const endGame = useCallback(() => {
    cancelAnimationFrame(animationFrameRef.current);
    saveHighScore(gameState.score);
    stopCamera();
    setGameState(prev => ({ ...prev, status: "menu" }));
    setFallingLetters([]);
  }, [gameState.score, saveHighScore, stopCamera]);

  // Handle game over
  useEffect(() => {
    if (gameState.status === "gameover") {
      cancelAnimationFrame(animationFrameRef.current);
      saveHighScore(gameState.score);
    }
  }, [gameState.status, gameState.score, saveHighScore]);

  // Resume game when unpaused
  useEffect(() => {
    if (gameState.status === "playing") {
      lastSpawnTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState.status, gameLoop]);

  // Run tracking during countdown to show preview
  useEffect(() => {
    let trackingInterval: NodeJS.Timeout;
    
    if (gameState.status === "countdown") {
      trackingInterval = setInterval(() => {
        detectPosition();
      }, 100); // Run tracking at ~10fps during countdown
    }
    
    return () => {
      if (trackingInterval) clearInterval(trackingInterval);
    };
  }, [gameState.status, detectPosition]);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      stopCamera();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [stopCamera]);

  // Calculate lane positions
  const laneWidth = useMemo(() => 100 / GAME_CONFIG.LANES, []);

  // Check if game is active (not menu or gameover)
  const isGameActive = gameState.status === "playing" || gameState.status === "paused" || gameState.status === "countdown";

  return (
    <div className="w-full min-h-screen bg-[#FDFFF2] overflow-hidden relative">
      {/* 
        CRITICAL: Single video element that persists across all game states.
        - Hidden during menu state
        - Visible as fullscreen background during countdown, playing, and paused states
        - This ensures stream is always connected and pose detection works correctly
      */}
      <video
        ref={videoRef}
        className={`fixed inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isGameActive ? "opacity-100 z-0" : "opacity-0 pointer-events-none -z-10"
        }`}
        playsInline
        muted
        autoPlay
        style={{ transform: "scaleX(-1)", top: isGameActive ? "64px" : 0, height: isGameActive ? "calc(100% - 64px)" : "100%" }}
      />
      {/* Hidden canvas for pose detection - always in DOM */}
      <canvas ref={canvasRef} className="hidden" />
      
      <Topbar 
        title="Tangkap Hijaiyah" 
        onBackClick={() => {
          endGame();
          router.back();
        }}
      />

      {/* ========== MENU SCREEN ========== */}
      {gameState.status === "menu" && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <div className="text-center mb-8">
            <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-4 bg-gradient-to-br from-[#E37100] to-[#BE9D77] rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
              <span className="text-5xl sm:text-6xl font-arabic text-white">ب</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#BE9D77] mb-2">Tangkap Hijaiyah</h1>
            <p className="text-[#BE9D77]/70 text-sm sm:text-base">Gerakkan tubuhmu untuk menangkap huruf!</p>
          </div>
          
          {gameState.highScore > 0 && (
            <div className="bg-[#EDD1B0]/30 backdrop-blur-sm rounded-xl px-6 py-3 mb-6 border border-[#BE9D77]/30">
              <p className="text-[#BE9D77]/70 text-sm">Skor Tertinggi</p>
              <p className="text-2xl font-bold text-[#E37100]">{gameState.highScore}</p>
            </div>
          )}
          
          <div className="bg-[#EDD1B0]/30 backdrop-blur-sm rounded-2xl p-5 sm:p-6 mb-8 max-w-sm w-full border border-[#BE9D77]/30">
            <h3 className="text-[#BE9D77] font-semibold mb-3 text-sm sm:text-base">Cara Bermain:</h3>
            <ul className="text-[#BE9D77]/80 text-xs sm:text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[#E37100] font-bold">1.</span>
                Huruf hijaiyah akan jatuh dari atas
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#E37100] font-bold">2.</span>
                Gerakkan tubuhmu ke kiri, tengah, atau kanan
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#E37100] font-bold">3.</span>
                Tangkap huruf sebelum jatuh melewati zona
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#E37100] font-bold">4.</span>
                Dengarkan dan hafalkan bunyi setiap huruf!
              </li>
            </ul>
          </div>
          
          {cameraError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 max-w-sm w-full">
              <p className="text-red-600 text-sm text-center">{cameraError}</p>
            </div>
          )}
          
          <button
            onClick={startGame}
            className="bg-gradient-to-r from-[#E37100] to-[#BE9D77] text-white px-10 sm:px-12 py-3 sm:py-4 rounded-full text-lg sm:text-xl font-bold shadow-xl hover:shadow-[#E37100]/30 hover:scale-105 transition-all flex items-center gap-3"
          >
            <Icon name="RiPlayFill" className="w-5 h-5 sm:w-6 sm:h-6" />
            Mulai Bermain
          </button>
        </div>
      )}

      {/* ========== COUNTDOWN SCREEN ========== */}
      {gameState.status === "countdown" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ top: "64px" }}>
          {/* Tracking overlay during countdown */}
          <canvas 
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ transform: "scaleX(-1)" }}
          />
          {/* Dark overlay on top of the video background */}
          <div className="absolute inset-0 bg-black/40" />
          <div className="text-center z-10">
            <div className="text-8xl sm:text-9xl font-bold text-[#E37100] animate-ping">
              {countdown}
            </div>
            <p className="text-white/80 mt-4 text-lg">Bersiap-siap!</p>
            {trackingResult && (
              <p className="text-white/60 mt-2 text-sm">
                Deteksi: {trackingResult.detectionMethod === 'face' ? '👤 Wajah' : 
                          trackingResult.detectionMethod === 'skinColor' ? '✋ Kulit' : 
                          trackingResult.detectionMethod === 'motion' ? '🏃 Gerakan' : '⏳ Mencari...'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ========== GAME SCREEN ========== */}
      {(gameState.status === "playing" || gameState.status === "paused") && (
        <div ref={gameContainerRef} className="relative w-full h-[calc(100vh-64px)] overflow-hidden">
          {/* Video is rendered as fixed element above, so we just add game elements here */}
          
          {/* Tracking overlay canvas - shows bounding box on camera */}
          <canvas 
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-[1]"
            style={{ transform: "scaleX(-1)" }}
          />
          
          {/* Subtle overlay to help letters stand out without hiding camera */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10 z-[2]" />
          
          {/* Lane Dividers */}
          <div className="absolute inset-0 flex pointer-events-none z-[3]">
            {Array.from({ length: GAME_CONFIG.LANES - 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-1 bg-white/30"
                style={{ left: `${((i + 1) * 100) / GAME_CONFIG.LANES}%` }}
              />
            ))}
          </div>
          
          {/* Falling Letters */}
          {fallingLetters.map(letter => (
            <div
              key={letter.id}
              className="absolute transition-transform duration-75 z-[4]"
              style={{
                left: `${letter.lane * laneWidth + laneWidth / 2}%`,
                top: letter.y,
                transform: "translateX(-50%)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-2xl shadow-xl border-4 border-white/50"
                style={{
                  width: GAME_CONFIG.LETTER_SIZE,
                  height: GAME_CONFIG.LETTER_SIZE,
                  backgroundColor: LANE_COLORS[letter.lane],
                }}
              >
                <span className="text-4xl sm:text-5xl font-arabic font-bold text-white drop-shadow-lg">
                  {letter.letter}
                </span>
              </div>
            </div>
          ))}
          
          {/* Catch Zone */}
          <div 
            className="absolute left-0 right-0 flex z-[5]"
            style={{ bottom: 60, height: GAME_CONFIG.CATCH_ZONE_HEIGHT }}
          >
            {Array.from({ length: GAME_CONFIG.LANES }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 mx-1 rounded-xl transition-all duration-150 flex items-center justify-center border-2
                  ${playerLane === i 
                    ? "bg-[#EDDD6E]/60 border-[#E37100] ring-4 ring-[#E37100]/50 shadow-lg shadow-[#E37100]/30" 
                    : "bg-white/20 border-white/30"
                  }`}
              >
                {playerLane === i && (
                  <Icon name="RiUser3Fill" className="w-10 h-10 text-[#E37100] drop-shadow-lg" />
                )}
              </div>
            ))}
          </div>
          
          {/* Catch Effects */}
          {catchEffects.map(effect => (
            <CatchEffectComponent key={effect.id} effect={effect} />
          ))}
          
          {/* Tracking Info Badge */}
          {trackingResult && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10">
              <div className={`px-3 py-1 rounded-full text-xs font-medium shadow-lg ${
                trackingResult.detectionMethod === 'face' ? 'bg-green-500 text-white' :
                trackingResult.detectionMethod === 'skinColor' ? 'bg-[#EDDD6E] text-black' :
                trackingResult.detectionMethod === 'motion' ? 'bg-[#E37100] text-white' :
                'bg-gray-500 text-white'
              }`}>
                {trackingResult.detectionMethod === 'face' ? '👤 Wajah Terdeteksi' : 
                 trackingResult.detectionMethod === 'skinColor' ? '✋ Kulit Terdeteksi' : 
                 trackingResult.detectionMethod === 'motion' ? '🏃 Gerakan Terdeteksi' : '⏳ Mencari...'}
              </div>
            </div>
          )}
          
          {/* HUD - Top */}
          <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex justify-between items-start z-10">
            <div className="bg-[#BE9D77]/90 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2 shadow-lg">
              <ScoreDisplay score={gameState.score} level={gameState.level} combo={gameState.combo} />
            </div>
            
            {currentLetterName && (
              <div className="bg-[#E37100]/90 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2 shadow-lg">
                <div className="text-white font-bold text-base sm:text-lg">{currentLetterName}</div>
              </div>
            )}
            
            <div className="bg-[#BE9D77]/90 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2 shadow-lg">
              <LivesDisplay lives={gameState.lives} maxLives={GAME_CONFIG.LIVES} />
            </div>
          </div>
          
          {/* Lane Labels */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-around px-2 z-10">
            {LANE_LABELS.map((label, i) => (
              <div
                key={label}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all shadow-md
                  ${playerLane === i
                    ? "bg-[#E37100] text-white scale-110 shadow-lg"
                    : "bg-white/70 text-[#BE9D77]"
                  }`}
              >
                {label}
              </div>
            ))}
          </div>
          
          {/* Controls */}
          <div className="absolute top-1/2 right-2 sm:right-4 -translate-y-1/2 flex flex-col gap-2 z-10">
            <button
              onClick={togglePause}
              className="bg-[#BE9D77]/80 backdrop-blur-sm p-2 sm:p-3 rounded-full hover:bg-[#BE9D77] transition shadow-lg"
            >
              <Icon
                name={gameState.status === "paused" ? "RiPlayFill" : "RiPauseFill"}
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
              />
            </button>
          </div>
          
          {/* Pause Overlay */}
          {gameState.status === "paused" && (
            <div className="absolute inset-0 bg-black/70 z-20 flex items-center justify-center px-4">
              <div className="bg-[#FDFFF2] backdrop-blur-sm rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-[#BE9D77]/30">
                <Icon name="RiPauseFill" className="w-16 h-16 text-[#BE9D77] mx-auto mb-4" />
                <h2 className="text-xl sm:text-2xl font-bold text-[#BE9D77] mb-6">Dijeda</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={togglePause}
                    className="flex-1 bg-[#E37100] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#E37100]/90 transition"
                  >
                    Lanjutkan
                  </button>
                  <button
                    onClick={endGame}
                    className="flex-1 bg-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-600 transition"
                  >
                    Keluar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== GAME OVER SCREEN ========== */}
      {gameState.status === "gameover" && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4">
          <div className="bg-[#FDFFF2] rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-[#BE9D77]/30">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <Icon name="RiEmotionSadLine" className="w-10 h-10 sm:w-12 sm:h-12 text-red-500" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-[#BE9D77] mb-2">Game Over!</h2>
            
            <div className="bg-[#EDD1B0]/30 rounded-xl p-4 my-6 border border-[#BE9D77]/20">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-[#BE9D77]/60 text-xs sm:text-sm">Skor</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#E37100]">{gameState.score}</p>
                </div>
                <div>
                  <p className="text-[#BE9D77]/60 text-xs sm:text-sm">Huruf Ditangkap</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-500">{gameState.lettersCaught}</p>
                </div>
                <div>
                  <p className="text-[#BE9D77]/60 text-xs sm:text-sm">Level Tercapai</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#BE9D77]">{gameState.level}</p>
                </div>
                <div>
                  <p className="text-[#BE9D77]/60 text-xs sm:text-sm">Skor Tertinggi</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#EDDD6E]">{gameState.highScore}</p>
                </div>
              </div>
            </div>
            
            {gameState.score >= gameState.highScore && gameState.score > 0 && (
              <div className="bg-[#EDDD6E]/30 border border-[#EDDD6E] rounded-xl p-3 mb-6">
                <p className="text-[#E37100] font-semibold text-sm sm:text-base">🎉 Skor Tertinggi Baru!</p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={startGame}
                className="flex-1 bg-gradient-to-r from-[#E37100] to-[#BE9D77] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition"
              >
                Main Lagi
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  router.back();
                }}
                className="flex-1 bg-[#BE9D77]/30 text-[#BE9D77] py-3 rounded-xl font-semibold hover:bg-[#BE9D77]/40 transition"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes bounce-up {
          0% { transform: translateY(0) translateX(-50%); opacity: 1; }
          100% { transform: translateY(-50px) translateX(-50%); opacity: 0; }
        }
        .animate-bounce-up {
          animation: bounce-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default TangkapHijaiyahGame;
