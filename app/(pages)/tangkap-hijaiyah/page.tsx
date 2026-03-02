"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import {
  hijaiyahGameLetters,
  shuffleArray,
} from "@/lib/data/hijaiyah-game-data";
import {
  initializeHandTracking,
  detectHands,
  drawHandSkeleton,
  checkHandCollision,
  resetHandTracking,
  cleanupHandTracking,
  HandTrackingResult,
} from "@/lib/services/hand-tracking-service";
import {
  playCorrectSFX,
  playWrongSFX,
  playLevelUpSFX,
  playGameOverSFX,
  playWinSFX,
  cleanupSFX,
} from "@/lib/services/game-sfx";
import { usePullToRefresh } from "@/contexts/PullToRefreshContext";

// ============================================
// GAME CONFIGURATION
// ============================================
const GAME_CONFIG = {
  LANES: 3,
  INITIAL_FALL_SPEED: 4.5,
  INITIAL_FALL_SPEED_MOBILE: 6,
  SPEED_INCREMENT: 1.2,
  SPEED_INCREMENT_MOBILE: 0.8,
  CARD_WIDTH: 136,
  CARD_HEIGHT: 136,
  COLLISION_SCALE_DESKTOP: 1.0,
  COLLISION_SCALE_MOBILE: 0.4,
  SPAWN_INTERVAL_INITIAL: 500,
  SPAWN_INTERVAL_MIN: 500,
  ROUND_DELAY: 2000,
  LIVES: 3,
  ROUNDS_PER_LEVEL: 5,
  MAX_LEVEL: 5,
  POINTS_CORRECT: 10,
  POINTS_WRONG: -5,
  COMBO_MULTIPLIER: 1.5,
  MOBILE_BREAKPOINT: 1024,
  LEVELUP_DISPLAY_TIME: 2500,
} as const;

// ============================================
// TYPES
// ============================================
interface FallingCard {
  id: string;
  letter: string;
  name: string;
  audio: string;
  lane: number;
  y: number;
  speed: number;
  isTarget: boolean;
  caught: boolean;
  missed: boolean;
}

interface GameRound {
  targetLetter: string;
  targetName: string;
  targetAudio: string;
  cards: FallingCard[];
  isActive: boolean;
}

interface GameState {
  status:
    | "menu"
    | "countdown"
    | "playing"
    | "paused"
    | "levelup"
    | "win"
    | "gameover";
  score: number;
  lives: number;
  level: number;
  roundsCompleted: number;
  combo: number;
  highScore: number;
}

interface CatchEffect {
  id: string;
  x: number;
  y: number;
  success: boolean;
  letter: string;
}

// ============================================
// ILLUSTRATION COMPONENTS
// ============================================
const RocketIllustration = React.memo(() => (
  <svg viewBox="0 0 160 200" className="w-36 h-44 mx-auto drop-shadow-lg">
    {/* Flames */}
    <ellipse cx="80" cy="188" rx="28" ry="12" fill="#FFB800" opacity="0.6" />
    <ellipse cx="80" cy="182" rx="18" ry="18" fill="#FF6B35" opacity="0.9" />
    <ellipse cx="80" cy="178" rx="10" ry="12" fill="#FBBF24" />
    {/* Rocket body */}
    <path d="M58 165 L58 78 C58 38 102 38 102 78 L102 165 Z" fill="#2DD4BF" />
    {/* Rocket stripe */}
    <rect x="58" y="130" width="44" height="35" fill="#14B8A6" rx="0" />
    {/* Rocket nose */}
    <path d="M58 78 C58 38 102 38 102 78" fill="#7C3AED" />
    {/* Window ring */}
    <circle cx="80" cy="92" r="16" fill="white" opacity="0.3" />
    {/* Window */}
    <circle cx="80" cy="92" r="12" fill="#EC4899" />
    <circle cx="76" cy="88" r="4" fill="white" opacity="0.4" />
    {/* Side fins */}
    <path d="M58 135 L38 168 L58 158 Z" fill="#7C3AED" />
    <path d="M102 135 L122 168 L102 158 Z" fill="#7C3AED" />
    {/* LEVEL UP text */}
    <text
      x="80"
      y="118"
      textAnchor="middle"
      fill="white"
      fontWeight="900"
      fontSize="12"
      fontFamily="system-ui, sans-serif"
    >
      LEVEL
    </text>
    <text
      x="80"
      y="134"
      textAnchor="middle"
      fill="#FBBF24"
      fontWeight="900"
      fontSize="14"
      fontFamily="system-ui, sans-serif"
    >
      UP
    </text>
  </svg>
));
RocketIllustration.displayName = "RocketIllustration";

const MedalIllustration = React.memo(() => (
  <svg viewBox="0 0 160 190" className="w-36 h-44 mx-auto drop-shadow-lg">
    {/* Ribbon left */}
    <path d="M52 5 L68 85 L80 75 L72 5 Z" fill="#2DD4BF" />
    {/* Ribbon right */}
    <path d="M108 5 L92 85 L80 75 L88 5 Z" fill="#14B8A6" />
    {/* Medal outer */}
    <circle cx="80" cy="120" r="50" fill="#F59E0B" />
    <circle
      cx="80"
      cy="120"
      r="43"
      fill="#FBBF24"
      stroke="#F59E0B"
      strokeWidth="2"
    />
    <circle cx="80" cy="120" r="36" fill="#F59E0B" opacity="0.3" />
    {/* Star */}
    <polygon
      points="80,88 88,108 110,108 92,120 98,140 80,128 62,140 68,120 50,108 72,108"
      fill="#FBBF24"
      stroke="#F59E0B"
      strokeWidth="1"
    />
    {/* Sparkles */}
    <circle cx="35" cy="55" r="4" fill="#FBBF24" opacity="0.8" />
    <circle cx="125" cy="45" r="3" fill="#FBBF24" opacity="0.7" />
    <circle cx="135" cy="95" r="4" fill="#F59E0B" opacity="0.6" />
    <circle cx="25" cy="100" r="3" fill="#FBBF24" opacity="0.7" />
    <circle cx="45" cy="165" r="3" fill="#FBBF24" opacity="0.5" />
    <circle cx="115" cy="170" r="4" fill="#F59E0B" opacity="0.5" />
  </svg>
));
MedalIllustration.displayName = "MedalIllustration";

const GameConsoleIllustration = React.memo(() => (
  <svg viewBox="0 0 160 170" className="w-36 h-40 mx-auto drop-shadow-lg">
    <defs>
      <linearGradient id="consoleGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2DD4BF" />
        <stop offset="100%" stopColor="#0D9488" />
      </linearGradient>
    </defs>
    {/* Console body */}
    <rect
      x="20"
      y="15"
      width="120"
      height="130"
      rx="22"
      fill="url(#consoleGrad)"
    />
    {/* Screen */}
    <rect x="38" y="30" width="84" height="60" rx="10" fill="#1F2937" />
    {/* X eyes */}
    <g stroke="#FBBF24" strokeWidth="3.5" strokeLinecap="round">
      <line x1="55" y1="48" x2="65" y2="58" />
      <line x1="65" y1="48" x2="55" y2="58" />
      <line x1="95" y1="48" x2="105" y2="58" />
      <line x1="105" y1="48" x2="95" y2="58" />
    </g>
    {/* Mouth */}
    <path
      d="M65 72 Q80 82 95 72"
      stroke="#FBBF24"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    {/* D-pad */}
    <rect x="42" y="103" width="24" height="8" rx="2" fill="#0D9488" />
    <rect x="50" y="95" width="8" height="24" rx="2" fill="#0D9488" />
    {/* Buttons */}
    <circle cx="104" cy="103" r="6" fill="#FBBF24" />
    <circle cx="118" cy="107" r="5" fill="#EC4899" />
    {/* Hearts falling from console */}
    <text x="30" y="158" fontSize="14" opacity="0.7">
      💛
    </text>
    <text x="65" y="165" fontSize="12" opacity="0.5">
      💛
    </text>
    <text x="110" y="160" fontSize="13" opacity="0.6">
      💛
    </text>
  </svg>
));
GameConsoleIllustration.displayName = "GameConsoleIllustration";

// ============================================
// HELPER COMPONENTS
// ============================================
const CatchEffectComponent = React.memo(
  ({ effect }: { effect: CatchEffect }) => (
    <div
      className="absolute z-30 pointer-events-none animate-bounce-up"
      style={{
        left: effect.x,
        top: effect.y,
        transform: "translateX(-50%)",
      }}
    >
      <div
        className={`text-3xl sm:text-5xl font-black drop-shadow-lg ${
          effect.success ? "text-[#14AE5C]" : "text-[#E53E3E]"
        }`}
      >
        {effect.success ? `+${GAME_CONFIG.POINTS_CORRECT}` : "✗"}
      </div>
    </div>
  ),
);
CatchEffectComponent.displayName = "CatchEffectComponent";

// ============================================
// MAIN GAME COMPONENT
// ============================================
const TangkapHijaiyahGame = () => {
  const router = useRouter();
  const { disablePullToRefresh, enablePullToRefresh } = usePullToRefresh();

  // Disable pull-to-refresh when component mounts (game page)
  useEffect(() => {
    disablePullToRefresh();
    return () => {
      enablePullToRefresh();
    };
  }, [disablePullToRefresh, enablePullToRefresh]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const roundEndTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Spawn guards
  const isSpawningRef = useRef<boolean>(false);
  const currentRoundIdRef = useRef<string>("");
  const lifeDeductedForRoundRef = useRef<boolean>(false);

  // Letter queue
  const lettersQueueRef = useRef<typeof hijaiyahGameLetters>([]);
  const letterIndexRef = useRef(0);

  // Refs for game loop
  const gameStateRef = useRef<GameState | null>(null);
  const currentRoundRef = useRef<GameRound | null>(null);
  const handResultRef = useRef<HandTrackingResult | null>(null);
  const gameDimensionsRef = useRef({
    width: typeof window !== "undefined" ? window.innerWidth - 24 : 376,
    height: typeof window !== "undefined" ? window.innerHeight - 160 : 500,
  });

  // State
  const [gameState, setGameState] = useState<GameState>({
    status: "menu",
    score: 0,
    lives: GAME_CONFIG.LIVES,
    level: 1,
    roundsCompleted: 0,
    combo: 0,
    highScore: 0,
  });

  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [handResult, setHandResult] = useState<HandTrackingResult | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [catchEffects, setCatchEffects] = useState<CatchEffect[]>([]);
  const [isWaitingNextRound, setIsWaitingNextRound] = useState(false);
  const [gameHeight, setGameHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight - 160 : 500,
  );
  const [gameWidth, setGameWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth - 24 : 376,
  );
  const [isHandTrackingReady, setIsHandTrackingReady] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Keep refs in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);

  useEffect(() => {
    handResultRef.current = handResult;
  }, [handResult]);

  useEffect(() => {
    gameDimensionsRef.current = { width: gameWidth, height: gameHeight };
  }, [gameWidth, gameHeight]);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem("tangkap_hijaiyah_highscore");
    if (saved) {
      setGameState((prev) => ({ ...prev, highScore: parseInt(saved) }));
    }
  }, []);

  // Scroll to top when game starts
  useEffect(() => {
    if (gameState.status !== "menu") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [gameState.status]);

  // Lock body scroll when game is active
  useEffect(() => {
    if (gameState.status !== "menu") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [gameState.status]);

  // Initialize dimensions on mount
  useEffect(() => {
    setGameWidth(window.innerWidth - 24);
    setGameHeight(window.innerHeight - 160);
    gameDimensionsRef.current = {
      width: window.innerWidth - 24,
      height: window.innerHeight - 160,
    };
  }, []);

  // Update game dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (gameContainerRef.current) {
        const rect = gameContainerRef.current.getBoundingClientRect();
        const width = rect.width || window.innerWidth - 24;
        const height = rect.height || window.innerHeight - 160;
        setGameHeight(height);
        setGameWidth(width);
        gameDimensionsRef.current = { width, height };
      } else {
        setGameWidth(window.innerWidth - 24);
        setGameHeight(window.innerHeight - 160);
        gameDimensionsRef.current = {
          width: window.innerWidth - 24,
          height: window.innerHeight - 160,
        };
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    const timer = setTimeout(updateDimensions, 100);
    return () => {
      window.removeEventListener("resize", updateDimensions);
      clearTimeout(timer);
    };
  }, [gameState.status]);

  // Save high score
  const saveHighScore = useCallback((score: number) => {
    const current = parseInt(
      localStorage.getItem("tangkap_hijaiyah_highscore") || "0",
    );
    if (score > current) {
      localStorage.setItem("tangkap_hijaiyah_highscore", score.toString());
      setGameState((prev) => ({ ...prev, highScore: score }));
    }
  }, []);

  // ============================================
  // CAMERA & HAND TRACKING
  // ============================================
  const initCamera = useCallback(async () => {
    try {
      setLoadingMessage("Mengakses kamera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
      }
      setLoadingMessage("Memuat model deteksi tangan...");
      const trackingReady = await initializeHandTracking();
      if (!trackingReady) {
        setCameraError(
          "Gagal memuat model deteksi tangan. Silakan refresh halaman.",
        );
        return false;
      }
      setIsHandTrackingReady(true);
      setCameraError(null);
      setLoadingMessage("");
      resetHandTracking();
      return true;
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError(
        "Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.",
      );
      setLoadingMessage("");
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // ============================================
  // AUDIO
  // ============================================
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

  // ============================================
  // GAME LOGIC
  // ============================================
  const getDistractorLetters = useCallback(
    (targetLetter: string, count: number) => {
      const available = hijaiyahGameLetters.filter(
        (l) => l.letter !== targetLetter,
      );
      const shuffled = shuffleArray([...available]);
      return shuffled.slice(0, count);
    },
    [],
  );

  // Spawn new round
  const spawnRound = useCallback(() => {
    if (isSpawningRef.current) return;
    isSpawningRef.current = true;

    if (lettersQueueRef.current.length === 0) {
      lettersQueueRef.current = shuffleArray([...hijaiyahGameLetters]);
      letterIndexRef.current = 0;
    }

    const targetData = lettersQueueRef.current[letterIndexRef.current];
    letterIndexRef.current =
      (letterIndexRef.current + 1) % lettersQueueRef.current.length;

    const distractors = getDistractorLetters(targetData.letter, 2);
    if (!distractors || distractors.length < 2) {
      lettersQueueRef.current = shuffleArray([...hijaiyahGameLetters]);
      letterIndexRef.current = 0;
      isSpawningRef.current = false;
      return;
    }

    const targetCard = {
      letter: targetData.letter,
      name: targetData.name,
      audio: targetData.audio,
      isTarget: true as const,
    };
    const distractorCard1 = {
      letter: distractors[0].letter,
      name: distractors[0].name,
      audio: distractors[0].audio,
      isTarget: false as const,
    };
    const distractorCard2 = {
      letter: distractors[1].letter,
      name: distractors[1].name,
      audio: distractors[1].audio,
      isTarget: false as const,
    };

    const allCards = [targetCard, distractorCard1, distractorCard2];
    const positions = shuffleArray([0, 1, 2]);

    const isMobile =
      typeof window !== "undefined" &&
      window.innerWidth < GAME_CONFIG.MOBILE_BREAKPOINT;
    const baseSpeed = isMobile
      ? GAME_CONFIG.INITIAL_FALL_SPEED_MOBILE
      : GAME_CONFIG.INITIAL_FALL_SPEED;
    const speedIncrement = isMobile
      ? GAME_CONFIG.SPEED_INCREMENT_MOBILE
      : GAME_CONFIG.SPEED_INCREMENT;
    const currentLevel = gameStateRef.current?.level ?? 1;
    const speed = baseSpeed + (currentLevel - 1) * speedIncrement;

    const roundId = `round-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    currentRoundIdRef.current = roundId;

    const cards: FallingCard[] = allCards.map((card, index) => ({
      id: `${roundId}-${index}-${card.letter}`,
      letter: card.letter,
      name: card.name,
      audio: card.audio,
      lane: positions[index],
      y: -GAME_CONFIG.CARD_HEIGHT,
      speed,
      isTarget: card.isTarget,
      caught: false,
      missed: false,
    }));

    // Safety check
    const targetCount = cards.filter((c) => c.isTarget === true).length;
    if (targetCount !== 1) {
      cards[0].isTarget = true;
      cards[0].letter = targetData.letter;
      cards[0].name = targetData.name;
      cards[0].audio = targetData.audio;
      cards[1].isTarget = false;
      cards[2].isTarget = false;
    }

    const actualTarget = cards.find((c) => c.isTarget);
    if (actualTarget && actualTarget.letter !== targetData.letter) {
      actualTarget.letter = targetData.letter;
      actualTarget.name = targetData.name;
      actualTarget.audio = targetData.audio;
    }

    const newRound: GameRound = {
      targetLetter: targetData.letter,
      targetName: targetData.name,
      targetAudio: targetData.audio,
      cards,
      isActive: true,
    };

    lifeDeductedForRoundRef.current = false;
    currentRoundRef.current = newRound;
    setCurrentRound(newRound);
    playAudio(targetData.audio);

    setTimeout(() => {
      isSpawningRef.current = false;
    }, 100);
  }, [getDistractorLetters, playAudio]);

  // Add catch effect
  const addCatchEffect = useCallback(
    (x: number, y: number, success: boolean, letter: string) => {
      const effect: CatchEffect = {
        id: `effect-${Date.now()}`,
        x,
        y,
        success,
        letter,
      };
      setCatchEffects((prev) => [...prev, effect]);
      setTimeout(() => {
        setCatchEffects((prev) => prev.filter((e) => e.id !== effect.id));
      }, 1500);
    },
    [],
  );

  // Lane positions
  const laneWidth = useMemo(() => gameWidth / GAME_CONFIG.LANES, [gameWidth]);
  const getLaneCenter = useCallback(
    (lane: number) => lane * laneWidth + laneWidth / 2,
    [laneWidth],
  );

  // Detect hand position
  const detectPosition = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isHandTrackingReady) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState !== 4) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const result = await detectHands(video, width, height);
    setHandResult(result);

    if (overlayCanvasRef.current && result.detected) {
      const overlayCtx = overlayCanvasRef.current.getContext("2d");
      if (overlayCtx) {
        overlayCanvasRef.current.width = gameWidth;
        overlayCanvasRef.current.height = gameHeight;
        overlayCtx.clearRect(0, 0, gameWidth, gameHeight);

        const scaleX = gameWidth / width;
        const scaleY = gameHeight / height;
        const scaledResult: HandTrackingResult = {
          ...result,
          landmarks:
            result.landmarks?.map((lm) => ({
              x: lm.x * scaleX,
              y: lm.y * scaleY,
              z: lm.z,
            })) || null,
          palmCenter: result.palmCenter
            ? {
                x: result.palmCenter.x * scaleX,
                y: result.palmCenter.y * scaleY,
              }
            : null,
          fingertips:
            result.fingertips?.map((ft) => ({
              x: ft.x * scaleX,
              y: ft.y * scaleY,
            })) || null,
          boundingBox: result.boundingBox
            ? {
                x: result.boundingBox.x * scaleX,
                y: result.boundingBox.y * scaleY,
                width: result.boundingBox.width * scaleX,
                height: result.boundingBox.height * scaleY,
              }
            : null,
        };

        const isMobileDevice =
          typeof window !== "undefined" &&
          window.innerWidth < GAME_CONFIG.MOBILE_BREAKPOINT;
        drawHandSkeleton(overlayCtx, scaledResult, gameWidth, gameHeight, {
          lineColor: "rgba(20, 174, 92, 0.6)",
          jointColor: "rgba(227, 113, 0, 0.7)",
          lineWidth: isMobileDevice ? 2 : 3,
          jointRadius: isMobileDevice ? 3 : 6,
          mirrorX: true,
        });
      }
    } else if (overlayCanvasRef.current) {
      const overlayCtx = overlayCanvasRef.current.getContext("2d");
      if (overlayCtx) overlayCtx.clearRect(0, 0, gameWidth, gameHeight);
    }
  }, [isHandTrackingReady, gameWidth, gameHeight]);

  // Process cards
  const processCards = useCallback(
    (
      roundData: GameRound,
      handResult: HandTrackingResult | null,
      gWidth: number,
      gHeight: number,
      getLaneCenterFn: (lane: number) => number,
    ): {
      updatedCards: FallingCard[];
      caughtCard: FallingCard | null;
      roundEnded: boolean;
      allMissed: boolean;
      hasChanges: boolean;
    } => {
      let caughtCard: FallingCard | null = null;
      let roundEnded = false;

      const updatedCards = roundData.cards.map((card) => {
        if (card.caught || card.missed) return card;
        const newY = card.y + card.speed;

        if (handResult?.detected && handResult?.landmarks) {
          const isMobile =
            typeof window !== "undefined" &&
            window.innerWidth < GAME_CONFIG.MOBILE_BREAKPOINT;
          const collisionScale = isMobile
            ? GAME_CONFIG.COLLISION_SCALE_MOBILE
            : GAME_CONFIG.COLLISION_SCALE_DESKTOP;
          const scaledWidth = GAME_CONFIG.CARD_WIDTH * collisionScale;
          const scaledHeight = GAME_CONFIG.CARD_HEIGHT * collisionScale;

          const cardRect = {
            x: getLaneCenterFn(card.lane) - scaledWidth / 2,
            y: newY + (GAME_CONFIG.CARD_HEIGHT - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight,
          };

          const videoWidth = videoRef.current?.videoWidth || 640;
          const videoHeight = videoRef.current?.videoHeight || 480;
          const scaleX = gWidth / videoWidth;
          const scaleY = gHeight / videoHeight;

          const scaledHandResult: HandTrackingResult = {
            ...handResult,
            fingertips:
              handResult.fingertips?.map((ft) => ({
                x: ft.x * scaleX,
                y: ft.y * scaleY,
              })) || null,
            palmCenter: handResult.palmCenter
              ? {
                  x: handResult.palmCenter.x * scaleX,
                  y: handResult.palmCenter.y * scaleY,
                }
              : null,
            landmarks:
              handResult.landmarks?.map((lm) => ({
                x: lm.x * scaleX,
                y: lm.y * scaleY,
                z: lm.z,
              })) || null,
            boundingBox: null,
          };

          if (checkHandCollision(scaledHandResult, cardRect, gWidth, true)) {
            const caught = { ...card, y: newY, caught: true };
            caughtCard = caught;
            roundEnded = true;
            return caught;
          }
        }

        if (newY > gHeight + 50) {
          return { ...card, missed: true };
        }
        return { ...card, y: newY };
      });

      const allMissed = updatedCards.every((c) => c.missed);
      if (allMissed && !roundEnded) roundEnded = true;

      return {
        updatedCards,
        caughtCard,
        roundEnded,
        allMissed,
        hasChanges: true,
      };
    },
    [],
  );

  // ============================================
  // GAME LOOP
  // ============================================
  const gameLoop = useCallback(
    (timestamp: number) => {
      const currentGameState = gameStateRef.current;
      const currentRoundData = currentRoundRef.current;
      const currentHandResult = handResultRef.current;
      const { width: gWidth, height: gHeight } = gameDimensionsRef.current;

      if (!currentGameState || currentGameState.status !== "playing") return;

      detectPosition();

      const timeSinceRoundEnd = timestamp - roundEndTimeRef.current;
      const roundIsInactive = !currentRoundData?.isActive;
      const delayPassed = timeSinceRoundEnd > GAME_CONFIG.ROUND_DELAY;
      const notCurrentlySpawning = !isSpawningRef.current;

      if (roundIsInactive && !delayPassed && roundEndTimeRef.current > 0) {
        setIsWaitingNextRound(true);
      } else if (!roundIsInactive) {
        setIsWaitingNextRound(false);
      }

      if (roundIsInactive && delayPassed && notCurrentlySpawning) {
        spawnRound();
        lastSpawnTimeRef.current = timestamp;
        setIsWaitingNextRound(false);
      }

      if (currentRoundData?.isActive) {
        const processedResult = processCards(
          currentRoundData,
          currentHandResult,
          gWidth,
          gHeight,
          getLaneCenter,
        );

        if (processedResult.hasChanges) {
          const updatedRound = {
            ...currentRoundData,
            cards: processedResult.updatedCards,
            isActive: !processedResult.roundEnded,
          };
          currentRoundRef.current = updatedRound;
          setCurrentRound(updatedRound);

          if (processedResult.caughtCard) {
            const { caughtCard } = processedResult;
            const cardCenterX = getLaneCenter(caughtCard.lane);
            const cardCenterY = caughtCard.y + GAME_CONFIG.CARD_HEIGHT / 2;
            roundEndTimeRef.current = performance.now();

            if (caughtCard.isTarget) {
              addCatchEffect(cardCenterX, cardCenterY, true, caughtCard.letter);
              playCorrectSFX();
              setGameState((prevState) => {
                const newCombo = prevState.combo + 1;
                const points = Math.floor(
                  GAME_CONFIG.POINTS_CORRECT * (1 + (newCombo - 1) * 0.2),
                );
                const newRoundsCompleted = prevState.roundsCompleted + 1;
                const newLevel = Math.min(
                  Math.floor(
                    newRoundsCompleted / GAME_CONFIG.ROUNDS_PER_LEVEL,
                  ) + 1,
                  GAME_CONFIG.MAX_LEVEL,
                );
                const newScore = prevState.score + points;

                // Win condition
                if (
                  newRoundsCompleted >=
                  GAME_CONFIG.MAX_LEVEL * GAME_CONFIG.ROUNDS_PER_LEVEL
                ) {
                  const winState: GameState = {
                    ...prevState,
                    score: newScore,
                    combo: newCombo,
                    roundsCompleted: newRoundsCompleted,
                    level: GAME_CONFIG.MAX_LEVEL,
                    status: "win",
                  };
                  gameStateRef.current = winState;
                  return winState;
                }

                // Level up condition
                if (newLevel > prevState.level) {
                  const levelUpState: GameState = {
                    ...prevState,
                    score: newScore,
                    combo: newCombo,
                    roundsCompleted: newRoundsCompleted,
                    level: newLevel,
                    status: "levelup",
                  };
                  gameStateRef.current = levelUpState;
                  return levelUpState;
                }

                return {
                  ...prevState,
                  score: newScore,
                  combo: newCombo,
                  roundsCompleted: newRoundsCompleted,
                  level: newLevel,
                };
              });
            } else {
              addCatchEffect(
                cardCenterX,
                cardCenterY,
                false,
                caughtCard.letter,
              );
              playWrongSFX();
              if (!lifeDeductedForRoundRef.current) {
                lifeDeductedForRoundRef.current = true;
                setGameState((prevState) => {
                  const newLives = prevState.lives - 1;
                  const newState: GameState = {
                    ...prevState,
                    lives: newLives,
                    combo: 0,
                    score: Math.max(
                      0,
                      prevState.score + GAME_CONFIG.POINTS_WRONG,
                    ),
                    status: newLives <= 0 ? "gameover" : prevState.status,
                  };
                  gameStateRef.current = newState;
                  if (newLives <= 0) {
                    return {
                      ...prevState,
                      lives: 0,
                      status: "gameover" as const,
                      combo: 0,
                    };
                  }
                  return {
                    ...prevState,
                    lives: newLives,
                    combo: 0,
                    score: Math.max(
                      0,
                      prevState.score + GAME_CONFIG.POINTS_WRONG,
                    ),
                  };
                });
              }
            }
          }

          // All cards missed
          if (processedResult.allMissed && !processedResult.caughtCard) {
            roundEndTimeRef.current = performance.now();
            playWrongSFX();
            if (!lifeDeductedForRoundRef.current) {
              lifeDeductedForRoundRef.current = true;
              setGameState((prevState) => {
                const newLives = prevState.lives - 1;
                const newState: GameState = {
                  ...prevState,
                  lives: newLives,
                  combo: 0,
                  status: newLives <= 0 ? "gameover" : prevState.status,
                };
                gameStateRef.current = newState;
                if (newLives <= 0) {
                  return {
                    ...prevState,
                    lives: 0,
                    status: "gameover" as const,
                    combo: 0,
                  };
                }
                return { ...prevState, lives: newLives, combo: 0 };
              });
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [detectPosition, spawnRound, getLaneCenter, addCatchEffect, processCards],
  );

  // ============================================
  // GAME ACTIONS
  // ============================================
  const startGame = useCallback(async () => {
    // Only init camera if not already running
    if (!streamRef.current) {
      const cameraReady = await initCamera();
      if (!cameraReady) return;
    } else {
      resetHandTracking();
    }

    setGameState((prev) => ({
      ...prev,
      status: "countdown",
      score: 0,
      lives: GAME_CONFIG.LIVES,
      level: 1,
      roundsCompleted: 0,
      combo: 0,
    }));

    setCurrentRound(null);
    currentRoundRef.current = null;
    setCatchEffects([]);
    setCountdown(3);
    roundEndTimeRef.current = 0;
    isSpawningRef.current = false;
    currentRoundIdRef.current = "";
    lifeDeductedForRoundRef.current = false;
    setIsWaitingNextRound(false);

    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownInterval);
        setCountdown(0);
        setGameState((prev) => ({ ...prev, status: "playing" }));
        lastSpawnTimeRef.current = performance.now();
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      }
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [initCamera, gameLoop]);

  const togglePause = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      status: prev.status === "playing" ? "paused" : "playing",
    }));
  }, []);

  const exitGame = useCallback(() => {
    cancelAnimationFrame(animationFrameRef.current);
    saveHighScore(gameState.score);
    stopCamera();
    cleanupHandTracking();
    setCurrentRound(null);
    currentRoundRef.current = null;
    router.back();
  }, [gameState.score, saveHighScore, stopCamera, router]);

  // ============================================
  // EFFECTS
  // ============================================

  // Handle game over & win
  useEffect(() => {
    if (gameState.status === "gameover" || gameState.status === "win") {
      cancelAnimationFrame(animationFrameRef.current);
      saveHighScore(gameState.score);
    }
  }, [gameState.status, gameState.score, saveHighScore]);

  // Play SFX on status transitions
  useEffect(() => {
    switch (gameState.status) {
      case "levelup":
        playLevelUpSFX();
        break;
      case "gameover":
        playGameOverSFX();
        break;
      case "win":
        playWinSFX();
        break;
    }
  }, [gameState.status]);

  // Handle level up auto-dismiss
  useEffect(() => {
    if (gameState.status === "levelup") {
      cancelAnimationFrame(animationFrameRef.current);

      const timer = setTimeout(() => {
        // Reset round state for clean restart at new speed
        setCurrentRound(null);
        currentRoundRef.current = null;
        roundEndTimeRef.current = 0;
        isSpawningRef.current = false;
        currentRoundIdRef.current = "";
        lifeDeductedForRoundRef.current = false;
        setIsWaitingNextRound(false);

        setGameState((prev) => ({ ...prev, status: "playing" }));
      }, GAME_CONFIG.LEVELUP_DISPLAY_TIME);

      return () => clearTimeout(timer);
    }
  }, [gameState.status]);

  // Resume game loop when playing
  useEffect(() => {
    if (gameState.status === "playing") {
      lastSpawnTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState.status, gameLoop]);

  // Run tracking during countdown
  useEffect(() => {
    let trackingInterval: NodeJS.Timeout;
    if (gameState.status === "countdown") {
      trackingInterval = setInterval(() => {
        detectPosition();
      }, 50);
    }
    return () => {
      if (trackingInterval) clearInterval(trackingInterval);
    };
  }, [gameState.status, detectPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      stopCamera();
      cleanupHandTracking();
      cleanupSFX();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [stopCamera]);

  // ============================================
  // DERIVED VALUES
  // ============================================
  const isGameActive = [
    "menu",
    "playing",
    "paused",
    "levelup",
    "gameover",
    "win",
  ].includes(gameState.status);
  const speedMultiplier = 1 + (gameState.level - 1) * 0.25;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="w-full min-h-screen bg-[#FDFFF2] overflow-hidden relative">
      {/* Hidden video & canvas for detection */}
      <video
        ref={videoRef}
        className="fixed opacity-0 pointer-events-none -z-10 top-0 left-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
        style={{ transform: "scaleX(-1)" }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* ========== COUNTDOWN SCREEN ========== */}
      {gameState.status === "countdown" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FDFFF2]">
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          />
          <div className="text-center z-20">
            <div className="text-[120px] sm:text-[150px] font-black text-[#E37100] leading-none animate-ping">
              {countdown}
            </div>
            <p className="text-[#BE9D77] mt-6 text-xl font-semibold">
              Bersiap-siap!
            </p>
            {handResult?.detected ? (
              <p className="text-[#14AE5C] mt-3 text-sm font-medium">
                ✋ Tangan Terdeteksi
              </p>
            ) : (
              <p className="text-amber-500 mt-3 text-sm font-medium animate-pulse">
                ⏳ Tunjukkan tanganmu ke kamera
              </p>
            )}
          </div>
        </div>
      )}

      {/* ========== GAME SCREEN ========== */}
      {isGameActive && (
        <div className="fixed inset-0 z-40 bg-[#FDFFF2] flex flex-col">
          {/* ---- TOP HUD ---- */}
          <div className="shrink-0 px-3 pt-3 pb-2 flex items-center justify-between gap-2">
            {/* Back button */}
            <button
              onClick={() => {
                if (gameState.status === "menu") {
                  router.back();
                } else {
                  setGameState((prev) => ({ ...prev, status: "paused" }));
                }
              }}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#BE9D77] shadow-md shrink-0 hover:opacity-90 transition"
            >
              <Icon name="RiArrowLeftLine" color="white" className="w-4 h-4" />
            </button>

            {/* Hearts */}
            <div className="flex gap-0.5 shrink-0">
              {Array.from({ length: GAME_CONFIG.LIVES }).map((_, i) => (
                <Icon
                  key={i}
                  name={i < gameState.lives ? "RiHeartFill" : "RiHeartLine"}
                  className={`w-6 h-6 sm:w-7 sm:h-7 ${
                    i < gameState.lives ? "text-red-500" : "text-gray-300"
                  }`}
                />
              ))}
            </div>

            {/* Score box */}
            <div className="bg-white rounded-xl px-4 py-1.5 border border-gray-200 shadow-sm flex items-center min-w-14 justify-center">
              <span className="font-bold text-gray-800 text-lg tabular-nums">
                {gameState.score}
              </span>
            </div>

            {/* Moon icon + Level badge */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xl">🌙</span>
              <div className="flex flex-col items-end leading-none">
                <span className="text-[10px] font-semibold text-gray-400 border border-gray-300 rounded px-1.5 py-0.5 bg-white/70">
                  Level {gameState.level}
                </span>
                <span className="text-sm font-bold text-[#E37100] mt-0.5">
                  {speedMultiplier.toFixed(1)}x
                </span>
              </div>
            </div>
          </div>

          {/* ---- GAME CONTAINER ---- */}
          <div className="flex-1 px-3 pb-2 min-h-0">
            <div
              ref={gameContainerRef}
              className="w-full h-full bg-white rounded-3xl shadow-lg overflow-hidden relative"
            >
              {/* Hand skeleton overlay */}
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              />

              {/* Falling Cards */}
              {currentRound?.cards.map((card) => {
                if (card.caught || card.missed) return null;
                return (
                  <div
                    key={card.id}
                    className="absolute z-5"
                    style={{
                      left: getLaneCenter(card.lane),
                      top: card.y,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div className="flex flex-col items-center justify-center w-21 h-25 sm:w-25 sm:h-30 md:w-30 md:h-35 rounded-2xl shadow-md border border-[#B8CCE0]/50 bg-[#CDDFEE] transition-none">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-arabic font-bold text-[#4A5568]">
                        {card.letter}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Catch Effects */}
              {catchEffects.map((effect) => (
                <CatchEffectComponent key={effect.id} effect={effect} />
              ))}

              {/* Waiting indicator */}
              {isWaitingNextRound && gameState.status === "playing" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#E37100] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[#BE9D77] font-medium text-sm">
                        Ronde berikutnya...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Hand detection subtle indicator */}
              {gameState.status === "playing" && (
                <div className="absolute top-3 right-3 z-20">
                  <div
                    className={`w-3 h-3 rounded-full shadow-sm ${
                      handResult?.detected
                        ? "bg-[#14AE5C]"
                        : "bg-amber-400 animate-pulse"
                    }`}
                    title={
                      handResult?.detected
                        ? "Tangan terdeteksi"
                        : "Tunjukkan tangan"
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* ---- BOTTOM BAR ---- */}
          {gameState.status !== "menu" && (
            <div className="shrink-0 px-3 pb-3 pt-1.5 flex items-center gap-3">
              {/* Spacer */}
              <div className="flex-1" />

              {/* Target letter pill */}
              {currentRound?.isActive && (
                <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md border border-gray-100">
                  <span className="text-gray-600 font-semibold text-sm">
                    Tangkap
                  </span>
                  <span className="text-2xl font-arabic font-bold text-[#4A5568] leading-none -mt-1">
                    {currentRound.targetLetter}
                  </span>
                  <button
                    onClick={() => playAudio(currentRound.targetAudio)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition"
                  >
                    <Icon
                      name="RiVolumeUpFill"
                      className="w-4 h-4 text-gray-500"
                    />
                  </button>
                </div>
              )}

              {/* Spacer to center the pill */}
              <div className="flex-1 flex justify-end">
                {/* Berhenti button */}
                <button
                  onClick={() =>
                    setGameState((prev) => ({ ...prev, status: "paused" }))
                  }
                  className="bg-[#BE9D77] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:bg-[#a88a65] transition"
                >
                  Berhenti
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== MENU MODAL OVERLAY ========== */}
      {gameState.status === "menu" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-[320px] w-full mx-4 text-center shadow-2xl animate-bounce-in">
            <div className="w-20 h-20 mx-auto mb-3 bg-[#EDD1B0]/40 rounded-full flex items-center justify-center">
              <span className="text-4xl">✋</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Tangkap Hijaiyah
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              Tangkap huruf hijaiyah yang benar dengan tanganmu!
            </p>

            {gameState.highScore > 0 && (
              <div className="mt-3 bg-[#EDD1B0]/20 rounded-xl px-4 py-2 inline-block">
                <span className="text-xs text-gray-400">Skor Tertinggi: </span>
                <span className="font-bold text-[#E37100]">
                  {gameState.highScore}
                </span>
              </div>
            )}

            {cameraError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                <p className="text-red-500 text-xs">{cameraError}</p>
              </div>
            )}

            {loadingMessage && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#E37100] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#E37100] text-xs">{loadingMessage}</p>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={startGame}
                disabled={!!loadingMessage}
                className="mt-5 w-full bg-[#E37100] text-white py-3 rounded-full font-semibold text-base hover:bg-[#d06800] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Icon name="RiPlayFill" className="w-5 h-5" />
                Mulai Bermain
              </button>
              <button
                onClick={exitGame}
                disabled={!!loadingMessage}
                className="w-full bg-[#BE9D77] text-white py-3 rounded-full font-semibold text-base hover:bg-[#a88a65] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Icon name="RiArrowLeftLine" className="w-5 h-5" />
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== LEVEL UP OVERLAY ========== */}
      {gameState.status === "levelup" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-[320px] w-full mx-4 text-center shadow-2xl animate-bounce-in">
            <RocketIllustration />
            <h2 className="text-2xl font-bold text-gray-800 mt-4">
              Yey Naik Level
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              Perhatikan kecepatan adik adik yaa!
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-[#E37100] font-bold text-lg">
                Level {gameState.level}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 text-sm">
                {speedMultiplier.toFixed(1)}x kecepatan
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========== PAUSE OVERLAY ========== */}
      {gameState.status === "paused" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-[320px] w-full mx-4 text-center shadow-2xl animate-bounce-in">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#EDD1B0]/40 rounded-full flex items-center justify-center">
              <Icon name="RiPauseFill" className="w-8 h-8 text-[#BE9D77]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Dijeda</h2>
            <p className="text-gray-500 text-sm mb-6">
              Mau lanjut atau keluar?
            </p>
            <div className="flex gap-3">
              <button
                onClick={togglePause}
                className="flex-1 bg-[#E37100] text-white py-2.5 rounded-full font-semibold hover:bg-[#d06800] transition shadow-md"
              >
                Lanjutkan
              </button>
              <button
                onClick={exitGame}
                className="flex-1 border-2 border-[#BE9D77] text-[#BE9D77] py-2.5 rounded-full font-semibold hover:bg-[#BE9D77]/10 transition"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== GAME OVER OVERLAY ========== */}
      {gameState.status === "gameover" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-[320px] w-full mx-4 text-center shadow-2xl animate-bounce-in">
            <div className="mb-2">
              <span className="text-3xl font-black bg-linear-to-r from-teal-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent tracking-tight">
                GAME OVER
              </span>
            </div>
            <GameConsoleIllustration />
            <h2 className="text-2xl font-bold text-gray-800 mt-3">
              Oow Belum Berhasil
            </h2>
            <p className="text-gray-500 mt-1 text-sm">Mau coba lagi?</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={startGame}
                className="flex-1 border-2 border-[#BE9D77] text-[#BE9D77] py-2.5 rounded-full font-semibold hover:bg-[#BE9D77]/10 transition"
              >
                Coba Lagi
              </button>
              <button
                onClick={exitGame}
                className="flex-1 bg-[#BE9D77] text-white py-2.5 rounded-full font-semibold hover:bg-[#a88a65] transition shadow-md"
              >
                Cukup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== WIN OVERLAY ========== */}
      {gameState.status === "win" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-[320px] w-full mx-4 text-center shadow-2xl animate-bounce-in">
            <div className="mb-2">
              <span className="text-3xl font-black bg-linear-to-r from-purple-600 via-pink-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
                YOU WIN!
              </span>
            </div>
            <MedalIllustration />
            <h2 className="text-2xl font-bold text-gray-800 mt-3">
              Yey Kamu Menang
            </h2>
            <p className="text-gray-500 mt-1 text-sm">Mau coba lagi?</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={startGame}
                className="flex-1 border-2 border-[#BE9D77] text-[#BE9D77] py-2.5 rounded-full font-semibold hover:bg-[#BE9D77]/10 transition"
              >
                Coba Lagi
              </button>
              <button
                onClick={exitGame}
                className="flex-1 bg-[#BE9D77] text-white py-2.5 rounded-full font-semibold hover:bg-[#a88a65] transition shadow-md"
              >
                Cukup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS animations */}
      <style jsx global>{`
        @keyframes bounce-up {
          0% {
            transform: translateY(0) translateX(-50%);
            opacity: 1;
          }
          100% {
            transform: translateY(-80px) translateX(-50%);
            opacity: 0;
          }
        }
        .animate-bounce-up {
          animation: bounce-up 2s ease-out forwards;
        }
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default TangkapHijaiyahGame;
