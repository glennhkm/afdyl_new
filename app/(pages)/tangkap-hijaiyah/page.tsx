"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/topbar";
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
import { usePullToRefresh } from "@/contexts/PullToRefreshContext";

// ============================================
// GAME CONFIGURATION
// ============================================
const GAME_CONFIG = {
  LANES: 3,
  INITIAL_FALL_SPEED: 5.0,
  INITIAL_FALL_SPEED_MOBILE: 8.0, // Faster on mobile
  SPEED_INCREMENT: 0.3,
  SPEED_INCREMENT_MOBILE: 0.5, // Faster increment on mobile
  CARD_WIDTH: 136,
  CARD_HEIGHT: 136,
  COLLISION_SCALE_DESKTOP: 1.0, // Full collision area on desktop
  COLLISION_SCALE_MOBILE: 0.4, // Smaller collision area on mobile/tablet (40%)
  SPAWN_INTERVAL_INITIAL: 500,
  SPAWN_INTERVAL_MIN: 500,
  ROUND_DELAY: 2000, // 2 second delay between rounds
  LIVES: 3,
  ROUNDS_PER_LEVEL: 5,
  POINTS_CORRECT: 10,
  POINTS_WRONG: -5,
  COMBO_MULTIPLIER: 1.5,
  MOBILE_BREAKPOINT: 1024, // Width threshold for tablet
} as const;

// Lane colors - matched to project theme
const LANE_COLORS = ["#E37100", "#E37100", "#E37100"];

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
  status: "menu" | "countdown" | "playing" | "paused" | "gameover";
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
// HELPER COMPONENTS
// ============================================
const LivesDisplay = React.memo(
  ({ lives, maxLives }: { lives: number; maxLives: number }) => (
    <div className="flex gap-1">
      {Array.from({ length: maxLives }).map((_, i) => (
        <Icon
          key={i}
          name={i < lives ? "RiHeartFill" : "RiHeartLine"}
          className={`w-5 h-5 sm:w-6 sm:h-6 ${i < lives ? "text-red-500" : "text-gray-500"}`}
        />
      ))}
    </div>
  ),
);
LivesDisplay.displayName = "LivesDisplay";

const ScoreDisplay = React.memo(
  ({
    score,
    level,
    combo,
  }: {
    score: number;
    level: number;
    combo: number;
  }) => (
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
  ),
);
ScoreDisplay.displayName = "ScoreDisplay";

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
        className={`text-4xl sm:text-6xl font-bold drop-shadow-lg ${effect.success ? "text-[#14AE5C]" : "text-red-500"}`}
      >
        {effect.success ? `+${GAME_CONFIG.POINTS_CORRECT}` : "Salah!"}
      </div>
    </div>
  ),
);
CatchEffectComponent.displayName = "CatchEffectComponent";

// Target Letter Display Component
const TargetLetterDisplay = React.memo(
  ({ letter, name }: { letter: string; name: string }) => (
    <div className="absolute left-1/2 -translate-x-1/2">
      <div className="text-center flex gap-6 items-center">
        <p className="text-white/80 font-bold text-xl">
          Tangkap huruf:
        </p>
        <div className="flex flex-col gap-2 -mt-6">
          <span className="text-5xl font-arabic font-bold text-white drop-shadow-lg">
            {letter}
          </span>
          <p className="text-white font-semibold text-sm sm:text-base capitalize -mt-6">
            {name}
          </p>
        </div>
      </div>
    </div>
  ),
);
TargetLetterDisplay.displayName = "TargetLetterDisplay";

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
  const roundEndTimeRef = useRef<number>(0); // Track when round ended for delay
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // CRITICAL: Spawn guard to prevent multiple spawn calls (race condition fix)
  const isSpawningRef = useRef<boolean>(false);
  const currentRoundIdRef = useRef<string>(""); // Track current round ID to prevent duplicates
  const lifeDeductedForRoundRef = useRef<boolean>(false); // Guard to prevent multiple life deductions per round

  // Letter queue
  const lettersQueueRef = useRef<typeof hijaiyahGameLetters>([]);
  const letterIndexRef = useRef(0);

  // Refs for game loop (to avoid recreating gameLoop callback)
  const gameStateRef = useRef<GameState | null>(null);
  const currentRoundRef = useRef<GameRound | null>(null);
  const handResultRef = useRef<HandTrackingResult | null>(null);
  const gameDimensionsRef = useRef({
    width: typeof window !== "undefined" ? window.innerWidth : 400,
    height: typeof window !== "undefined" ? window.innerHeight - 200 : 600,
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
    typeof window !== "undefined" ? window.innerHeight - 200 : 600,
  );
  const [gameWidth, setGameWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 400,
  );
  const [isHandTrackingReady, setIsHandTrackingReady] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Keep refs in sync with state
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

  // Scroll to top when game starts (status changes from "menu")
  useEffect(() => {
    if (gameState.status !== "menu") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [gameState.status]);

  // Lock body scroll when game is active or any overlay is shown
  useEffect(() => {
    if (gameState.status !== "menu") {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [gameState.status]);

  // Initialize dimensions on mount (client-side only)
  useEffect(() => {
    setGameWidth(window.innerWidth);
    setGameHeight(window.innerHeight - 200);
    gameDimensionsRef.current = {
      width: window.innerWidth,
      height: window.innerHeight - 200,
    };
  }, []);

  // Update game dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (gameContainerRef.current) {
        const rect = gameContainerRef.current.getBoundingClientRect();
        const width = rect.width || window.innerWidth;
        const height = rect.height || window.innerHeight - 200;
        setGameHeight(height);
        setGameWidth(width);
        gameDimensionsRef.current = { width, height };
      } else {
        // Fallback when container not yet mounted
        setGameWidth(window.innerWidth);
        setGameHeight(window.innerHeight - 200);
        gameDimensionsRef.current = {
          width: window.innerWidth,
          height: window.innerHeight - 200,
        };
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    // Also update on game status change
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

  // Initialize camera and hand tracking
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

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
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

  // Get random letters for distractors
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

  // Spawn new round (3 cards)
  const spawnRound = useCallback(() => {
    // CRITICAL: Prevent multiple spawns due to race condition
    if (isSpawningRef.current) {
      console.log("Spawn blocked - already spawning");
      return;
    }

    // Set spawning guard IMMEDIATELY (synchronous)
    isSpawningRef.current = true;

    if (lettersQueueRef.current.length === 0) {
      lettersQueueRef.current = shuffleArray([...hijaiyahGameLetters]);
      letterIndexRef.current = 0;
    }

    const targetData = lettersQueueRef.current[letterIndexRef.current];
    letterIndexRef.current =
      (letterIndexRef.current + 1) % lettersQueueRef.current.length;

    // Get 2 distractors - ensure they're different from target
    const distractors = getDistractorLetters(targetData.letter, 2);

    // Safety check: ensure we have valid distractors
    if (!distractors || distractors.length < 2) {
      console.error("Failed to get enough distractors, retrying...");
      // Retry with fresh shuffle
      lettersQueueRef.current = shuffleArray([...hijaiyahGameLetters]);
      letterIndexRef.current = 0;
      isSpawningRef.current = false; // Release guard on early return
      return;
    }

    // Create cards EXPLICITLY with separate objects to avoid any reference issues
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

    // Combine cards - target is ALWAYS first before shuffle
    const allCards = [targetCard, distractorCard1, distractorCard2];

    // Shuffle positions (0, 1, 2) instead of cards themselves to preserve isTarget
    const positions = shuffleArray([0, 1, 2]);

    // Use faster speed on mobile devices
    const isMobile =
      typeof window !== "undefined" &&
      window.innerWidth < GAME_CONFIG.MOBILE_BREAKPOINT;
    const baseSpeed = isMobile
      ? GAME_CONFIG.INITIAL_FALL_SPEED_MOBILE
      : GAME_CONFIG.INITIAL_FALL_SPEED;
    const speedIncrement = isMobile
      ? GAME_CONFIG.SPEED_INCREMENT_MOBILE
      : GAME_CONFIG.SPEED_INCREMENT;
    const speed = baseSpeed + (gameState.level - 1) * speedIncrement;

    // Generate unique round ID to prevent duplicate rounds
    const roundId = `round-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    currentRoundIdRef.current = roundId;

    // Create falling cards with shuffled lane positions
    const cards: FallingCard[] = allCards.map((card, index) => ({
      id: `${roundId}-${index}-${card.letter}`,
      letter: card.letter,
      name: card.name,
      audio: card.audio,
      lane: positions[index], // Shuffled lane position
      y: -GAME_CONFIG.CARD_HEIGHT,
      speed,
      isTarget: card.isTarget, // This is now guaranteed correct
      caught: false,
      missed: false,
    }));

    // CRITICAL SAFETY CHECK: Verify exactly one target exists
    const targetCount = cards.filter((c) => c.isTarget === true).length;
    const targetInCards = cards.find((c) => c.isTarget === true);

    if (targetCount !== 1 || !targetInCards) {
      console.error(
        `CRITICAL BUG: Expected 1 target, found ${targetCount}. Forcing target card.`,
      );
      // Force fix: make first card the target
      cards[0].isTarget = true;
      cards[0].letter = targetData.letter;
      cards[0].name = targetData.name;
      cards[0].audio = targetData.audio;
      cards[1].isTarget = false;
      cards[2].isTarget = false;
    }

    // Verify target letter matches
    const actualTarget = cards.find((c) => c.isTarget);
    if (actualTarget && actualTarget.letter !== targetData.letter) {
      console.error(
        `CRITICAL BUG: Target letter mismatch! Expected ${targetData.letter}, got ${actualTarget.letter}`,
      );
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

    // Final verification log (can be removed in production)
    console.log(
      `Round spawned [${roundId}]: Target=${targetData.letter}, Cards=[${cards.map((c) => `${c.letter}(${c.isTarget ? "T" : "F"})`).join(", ")}]`,
    );

    // Reset life deducted guard for new round
    lifeDeductedForRoundRef.current = false;

    // Update state and ref SYNCHRONOUSLY to prevent race conditions
    currentRoundRef.current = newRound;
    setCurrentRound(newRound);

    // Play target letter audio
    playAudio(targetData.audio);

    // Release spawn guard after a short delay to ensure state is settled
    // This prevents any potential race condition from rapid game loop calls
    setTimeout(() => {
      isSpawningRef.current = false;
    }, 100);
  }, [gameState.level, getDistractorLetters, playAudio]);

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

  // Calculate lane positions
  const laneWidth = useMemo(() => gameWidth / GAME_CONFIG.LANES, [gameWidth]);

  const getLaneCenter = useCallback(
    (lane: number) => {
      return lane * laneWidth + laneWidth / 2;
    },
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

    // Draw hand skeleton on overlay canvas
    if (overlayCanvasRef.current && result.detected) {
      const overlayCtx = overlayCanvasRef.current.getContext("2d");
      if (overlayCtx) {
        overlayCanvasRef.current.width = gameWidth;
        overlayCanvasRef.current.height = gameHeight;
        overlayCtx.clearRect(0, 0, gameWidth, gameHeight);

        // Scale landmarks to game dimensions
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

        // Use smaller hand skeleton on mobile/tablet
        const isMobileDevice =
          typeof window !== "undefined" &&
          window.innerWidth < GAME_CONFIG.MOBILE_BREAKPOINT;

        drawHandSkeleton(overlayCtx, scaledResult, gameWidth, gameHeight, {
          lineColor: "#00FF00",
          jointColor: "#FF0000",
          lineWidth: isMobileDevice ? 2 : 4,
          jointRadius: isMobileDevice ? 4 : 8,
          mirrorX: true,
        });
      }
    } else if (overlayCanvasRef.current) {
      const overlayCtx = overlayCanvasRef.current.getContext("2d");
      if (overlayCtx) {
        overlayCtx.clearRect(0, 0, gameWidth, gameHeight);
      }
    }
  }, [isHandTrackingReady, gameWidth, gameHeight]);

  // Helper function to process cards (defined before gameLoop to avoid hoisting issues)
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

        // Check collision with hand
        if (handResult?.detected && handResult?.landmarks) {
          // Use smaller collision area on mobile/tablet for less error tolerance
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
            y: newY + (GAME_CONFIG.CARD_HEIGHT - scaledHeight) / 2, // Center the smaller hitbox
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

        // Check if card missed (fell past screen)
        if (newY > gHeight + 50) {
          return { ...card, missed: true };
        }

        return { ...card, y: newY };
      });

      const allMissed = updatedCards.every((c) => c.missed);
      if (allMissed && !roundEnded) {
        roundEnded = true;
      }

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

  // Game loop - using refs to avoid recreating callback
  const gameLoop = useCallback(
    (timestamp: number) => {
      const currentGameState = gameStateRef.current;
      const currentRoundData = currentRoundRef.current;
      const currentHandResult = handResultRef.current;
      const { width: gWidth, height: gHeight } = gameDimensionsRef.current;

      if (!currentGameState || currentGameState.status !== "playing") return;

      // Detect hand position
      detectPosition();

      // Spawn new round if none active (with delay after previous round)
      const timeSinceRoundEnd = timestamp - roundEndTimeRef.current;
      const roundIsInactive = !currentRoundData?.isActive;
      const delayPassed = timeSinceRoundEnd > GAME_CONFIG.ROUND_DELAY;
      const notCurrentlySpawning = !isSpawningRef.current;

      // Update waiting state for UI
      if (roundIsInactive && !delayPassed && roundEndTimeRef.current > 0) {
        setIsWaitingNextRound(true);
      } else if (!roundIsInactive) {
        setIsWaitingNextRound(false);
      }

      // CRITICAL: Only spawn if ALL conditions are met
      if (roundIsInactive && delayPassed && notCurrentlySpawning) {
        console.log(`Spawning new round - delay: ${timeSinceRoundEnd}ms`);
        spawnRound();
        lastSpawnTimeRef.current = timestamp;
        setIsWaitingNextRound(false);
      }

      // Update cards - always update even without hand detection
      if (currentRoundData?.isActive) {
        // First pass: update card positions and check collisions
        const processedResult = processCards(
          currentRoundData,
          currentHandResult,
          gWidth,
          gHeight,
          getLaneCenter,
        );

        if (processedResult.hasChanges) {
          // Update ref first (synchronous) to prevent race conditions
          const updatedRound = {
            ...currentRoundData,
            cards: processedResult.updatedCards,
            isActive: !processedResult.roundEnded,
          };
          currentRoundRef.current = updatedRound;

          // Then update state
          setCurrentRound(updatedRound);

          // Handle caught card effects
          if (processedResult.caughtCard) {
            const { caughtCard } = processedResult;
            const cardCenterX = getLaneCenter(caughtCard.lane);
            const cardCenterY = caughtCard.y + GAME_CONFIG.CARD_HEIGHT / 2;

            // Set round end time for delay before next round
            roundEndTimeRef.current = performance.now();

            if (caughtCard.isTarget) {
              addCatchEffect(cardCenterX, cardCenterY, true, caughtCard.letter);
              setGameState((prevState) => {
                const newCombo = prevState.combo + 1;
                const points = Math.floor(
                  GAME_CONFIG.POINTS_CORRECT * (1 + (newCombo - 1) * 0.2),
                );
                const newRoundsCompleted = prevState.roundsCompleted + 1;
                const newLevel =
                  Math.floor(
                    newRoundsCompleted / GAME_CONFIG.ROUNDS_PER_LEVEL,
                  ) + 1;
                return {
                  ...prevState,
                  score: prevState.score + points,
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
              // CRITICAL: Check guard to prevent multiple life deductions
              if (!lifeDeductedForRoundRef.current) {
                lifeDeductedForRoundRef.current = true; // Set guard immediately
                setGameState((prevState) => {
                  const newLives = prevState.lives - 1;
                  // Update ref immediately to prevent race condition
                  gameStateRef.current = {
                    ...prevState,
                    lives: newLives,
                    combo: 0,
                    score: Math.max(0, prevState.score + GAME_CONFIG.POINTS_WRONG),
                    status: newLives <= 0 ? "gameover" : prevState.status,
                  };
                  if (newLives <= 0) {
                    return {
                      ...prevState,
                      lives: 0,
                      status: "gameover",
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

          // Handle all cards missed
          if (processedResult.allMissed && !processedResult.caughtCard) {
            // Set round end time for delay before next round
            roundEndTimeRef.current = performance.now();

            // CRITICAL: Check guard to prevent multiple life deductions
            if (!lifeDeductedForRoundRef.current) {
              lifeDeductedForRoundRef.current = true; // Set guard immediately
              setGameState((prevState) => {
                const newLives = prevState.lives - 1;
                // Update ref immediately to prevent race condition
                gameStateRef.current = {
                  ...prevState,
                  lives: newLives,
                  combo: 0,
                  status: newLives <= 0 ? "gameover" : prevState.status,
                };
                if (newLives <= 0) {
                  return { ...prevState, lives: 0, status: "gameover", combo: 0 };
                }
                return { ...prevState, lives: newLives, combo: 0 };
              });
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    },
    // Minimal dependencies - using refs for dynamic values
    [detectPosition, spawnRound, getLaneCenter, addCatchEffect, processCards],
  );

  // Start game
  const startGame = useCallback(async () => {
    const cameraReady = await initCamera();
    if (!cameraReady) return;

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
    currentRoundRef.current = null; // Also reset ref
    setCatchEffects([]);
    setCountdown(3);
    resetHandTracking();
    roundEndTimeRef.current = 0; // Reset round end time
    isSpawningRef.current = false; // Reset spawn guard
    currentRoundIdRef.current = ""; // Reset round ID
    lifeDeductedForRoundRef.current = false; // Reset life deduction guard
    setIsWaitingNextRound(false); // Reset waiting state

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

  // Toggle pause
  const togglePause = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      status: prev.status === "playing" ? "paused" : "playing",
    }));
  }, []);

  // End game
  const endGame = useCallback(() => {
    cancelAnimationFrame(animationFrameRef.current);
    saveHighScore(gameState.score);
    stopCamera();
    cleanupHandTracking();
    setGameState((prev) => ({ ...prev, status: "menu" }));
    setCurrentRound(null);
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

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      stopCamera();
      cleanupHandTracking();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [stopCamera]);

  return (
    <div className="w-full min-h-screen bg-[#FDFFF2] overflow-hidden relative">
      {/* Video element - hidden but still active for detection */}
      <video
        ref={videoRef}
        className="fixed opacity-0 pointer-events-none -z-10 top-0 left-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
        style={{ transform: "scaleX(-1)" }}
      />
      {/* Hidden canvas for detection */}
      <canvas ref={canvasRef} className="hidden" />

      {gameState.status === "menu" && (
        <Topbar
          title="Tangkap Hijaiyah"
          onBackClick={() => {
            endGame();
            router.back();
          }}
        />
      )}

      {/* ========== MENU SCREEN ========== */}
      {gameState.status === "menu" && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <div className="text-center mb-8">
            <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-4 bg-gradient-to-br from-[#E37100] to-[#BE9D77] rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
              <span className="text-5xl sm:text-6xl font-arabic text-white">
                ✋
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#BE9D77] mb-2">
              Tangkap Hijaiyah
            </h1>
            <p className="text-[#BE9D77]/70 text-sm sm:text-base">
              Gunakan tanganmu untuk menangkap huruf yang benar!
            </p>
          </div>

          {gameState.highScore > 0 && (
            <div className="bg-[#EDD1B0]/30 backdrop-blur-sm rounded-xl px-6 py-3 mb-6 border border-[#BE9D77]/30">
              <p className="text-[#BE9D77]/70 text-sm">Skor Tertinggi</p>
              <p className="text-2xl font-bold text-[#E37100]">
                {gameState.highScore}
              </p>
            </div>
          )}

          <div className="bg-[#EDD1B0]/30 backdrop-blur-sm rounded-2xl p-5 sm:p-6 mb-8 max-w-sm w-full border border-[#BE9D77]/30">
            <h3 className="text-[#BE9D77] font-semibold mb-3 text-sm sm:text-base">
              Cara Bermain:
            </h3>
            <ul className="text-[#BE9D77]/80 text-xs sm:text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[#E37100] font-bold">1.</span>
                Huruf target akan ditampilkan dan disuarakan
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#E37100] font-bold">2.</span>3 kartu
                huruf akan jatuh bersamaan
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#E37100] font-bold">3.</span>
                Gunakan tanganmu untuk menangkap huruf yang BENAR
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#E37100] font-bold">4.</span>
                Hati-hati! Menangkap huruf salah akan mengurangi nyawa
              </li>
            </ul>
          </div>

          {cameraError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 max-w-sm w-full">
              <p className="text-red-600 text-sm text-center">{cameraError}</p>
            </div>
          )}

          {loadingMessage && (
            <div className="bg-[#E37100]/20 border border-[#E37100]/50 rounded-xl p-4 mb-6 max-w-sm w-full">
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-[#E37100] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#E37100] text-sm">{loadingMessage}</p>
              </div>
            </div>
          )}

          <button
            onClick={startGame}
            disabled={!!loadingMessage}
            className="bg-gradient-to-r from-[#E37100] to-[#BE9D77] text-white px-10 sm:px-12 py-3 sm:py-4 rounded-full text-lg sm:text-xl font-bold shadow-xl hover:shadow-[#E37100]/30 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="RiPlayFill" className="w-5 h-5 sm:w-6 sm:h-6" />
            Mulai Bermain
          </button>
        </div>
      )}

      {/* ========== COUNTDOWN SCREEN ========== */}
      {gameState.status === "countdown" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          style={{ top: "0px" }}
        >
          {/* Neutral game area background with grid */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#2a3a4a] to-[#1a2a3a]">
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: "50px 50px",
              }}
            />
            {/* Subtle radial glow */}
            <div
              className="absolute inset-0 bg-gradient-radial from-[#E37100]/10 via-transparent to-transparent"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(227, 113, 0, 0.1) 0%, transparent 70%)",
              }}
            />
          </div>
          {/* Hand skeleton overlay - no CSS mirror since drawHandSkeleton handles it */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          />
          <div className="text-center z-10">
            <div className="text-8xl sm:text-9xl font-bold text-[#E37100] animate-ping">
              {countdown}
            </div>
            <p className="text-white/80 mt-4 text-lg">Bersiap-siap!</p>
            {handResult?.detected ? (
              <p className="text-green-400 mt-2 text-sm">
                ✋ Tangan Terdeteksi
              </p>
            ) : (
              <p className="text-yellow-400 mt-2 text-sm">
                ⏳ Tunjukkan tanganmu ke kamera
              </p>
            )}
          </div>
        </div>
      )}

      {/* ========== GAME SCREEN ========== */}
      {(gameState.status === "playing" ||
        gameState.status === "paused" ||
        gameState.status === "gameover") && (
        <div
          ref={gameContainerRef}
          // className="fixed inset-0 left-0 top-20 sm:top-24 md:top-28 lg:top-32 w-screen h-[calc(100vh-60px)] md:h-[calc(100vh-128px)] overflow-hidden"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden h-screen w-screen"
        >
          {/* Neutral game area background with grid */}
          <div className="absolute inset-0 bg-linear-to-b from-[#2a3a4a] to-[#1a2a3a] z-0">
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
                `,
                backgroundSize: "60px 60px",
              }}
            />
            {/* Horizontal accent lines */}
            <div className="absolute top-1/4 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#E37100]/30 to-transparent" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#E37100]/20 to-transparent" />
            <div className="absolute top-3/4 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#E37100]/30 to-transparent" />
            {/* Subtle radial glow at center */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at center 70%, rgba(227, 113, 0, 0.08) 0%, transparent 50%)",
              }}
            />
          </div>

          {/* Hand skeleton overlay - no CSS mirror since drawHandSkeleton handles it */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          />

          {/* Lane Dividers */}
          <div className="absolute inset-0 flex pointer-events-none z-[3]">
            {Array.from({ length: GAME_CONFIG.LANES - 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-0.5 bg-white/20"
                style={{ left: `${((i + 1) * 100) / GAME_CONFIG.LANES}%` }}
              />
            ))}
          </div>

          {/* Falling Cards */}
          {currentRound?.cards.map((card) => {
            if (card.caught || card.missed) return null;
            return (
              <div
                key={card.id}
                className="absolute transition-transform duration-75 z-5"
                style={{
                  left: getLaneCenter(card.lane),
                  top: card.y,
                  transform: "translateX(-50%)",
                }}
              >
                <div
                  className="flex flex-col items-center justify-center w-24 h-24 md:w-34 md:h-34 rounded-2xl shadow-xl border-4 border-white/50"
                  style={{
                    backgroundColor: LANE_COLORS[card.lane],
                  }}
                >
                  <span className="text-2xl sm:text-3xl font-arabic font-bold text-white drop-shadow-lg">
                    {card.letter}
                  </span>
                  <span className="text-base text-white/80 mt-1 capitalize">
                    {card.name}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Catch Effects */}
          {catchEffects.map((effect) => (
            <CatchEffectComponent key={effect.id} effect={effect} />
          ))}

          {/* Hand Detection Status */}
          {handResult && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium shadow-lg ${
                  handResult.detected
                    ? "bg-green-500 text-white"
                    : "bg-yellow-500 text-black"
                }`}
              >
                {handResult.detected
                  ? "✋ Tangan Terdeteksi"
                  : "⏳ Tunjukkan Tangan"}
              </div>
            </div>
          )}

          {/* HUD - Top */}
          <div className="absolute inset-x-0 top-0 z-20 bg-linear-to-br from-[#E37100] to-[#BE9D77] rounded-b-2xl py-3 px-3 sm:py-4 sm:px-6 lg:py-6 lg:px-8 shadow-2xl border-4 border-white/50">
            {/* Mobile Layout (single row compact) */}
            <div className="flex md:hidden items-center justify-between gap-2">
              <button
                onClick={() => router.back()}
                className="p-1.5 flex items-center justify-center rounded-full bg-brown-brand cursor-pointer hover:opacity-90 duration-200 shadow-lg shrink-0"
              >
                <Icon
                  name="RiArrowLeftLine"
                  color="white"
                  className="w-5 h-5"
                />
              </button>
              
              {/* Target Letter - Mobile */}
              {currentRound?.isActive ? (
                <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5">
                  <span className="text-white/90 text-xs font-medium">Tangkap:</span>
                  <span className="text-2xl font-arabic font-bold text-white">{currentRound.targetLetter}</span>
                </div>
              ) : (
                <h1 className="font-bold text-white text-sm truncate">Tangkap Hijaiyah</h1>
              )}

              <div className="flex items-center gap-2 shrink-0">
                <LivesDisplay
                  lives={gameState.lives}
                  maxLives={GAME_CONFIG.LIVES}
                />
                <div className="bg-[#BE9D77]/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-lg">
                  <div className="text-white font-bold text-sm">{gameState.score}</div>
                </div>
                <button
                  onClick={togglePause}
                  className="bg-[#BE9D77]/80 backdrop-blur-sm p-1.5 rounded-lg hover:bg-[#BE9D77] transition shadow-lg"
                >
                  <Icon
                    name={gameState.status === "paused" ? "RiPlayFill" : "RiPauseFill"}
                    className="w-5 h-5 text-white"
                  />
                </button>
              </div>
            </div>

            {/* Tablet/Desktop Layout */}
            <div className="hidden md:flex items-center justify-between gap-4">
              <div className="flex gap-4 lg:gap-6 items-center">
                <button
                  onClick={() => router.back()}
                  className="p-2 lg:p-3 flex items-center justify-center rounded-full bg-brown-brand cursor-pointer hover:opacity-90 duration-200 shadow-lg"
                >
                  <Icon
                    name="RiArrowLeftLine"
                    color="white"
                    className="w-6 lg:w-8 h-6 lg:h-8"
                  />
                </button>
                <h1 className="font-bold text-white text-xl lg:text-2xl xl:text-4xl">
                  Tangkap Hijaiyah
                </h1>
              </div>

              {/* Target Letter Display - Desktop */}
              {currentRound?.isActive && (
                <div className="flex items-center gap-4 bg-white/20 rounded-xl px-4 py-2">
                  <p className="text-white/90 font-bold text-base lg:text-xl">
                    Tangkap huruf:
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-4xl lg:text-5xl font-arabic font-bold text-white drop-shadow-lg">
                      {currentRound.targetLetter}
                    </span>
                    <span className="text-white font-semibold text-sm lg:text-base capitalize">
                      ({currentRound.targetName})
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 lg:gap-4">
                <LivesDisplay
                  lives={gameState.lives}
                  maxLives={GAME_CONFIG.LIVES}
                />
                <div className="bg-[#BE9D77]/90 backdrop-blur-sm rounded-xl px-3 lg:px-4 py-2 shadow-lg">
                  <ScoreDisplay
                    score={gameState.score}
                    level={gameState.level}
                    combo={gameState.combo}
                  />
                </div>
                <button
                  onClick={togglePause}
                  className="bg-[#BE9D77]/80 backdrop-blur-sm p-2 lg:p-3 rounded-xl hover:bg-[#BE9D77] transition shadow-lg"
                >
                  <Icon
                    name={gameState.status === "paused" ? "RiPlayFill" : "RiPauseFill"}
                    className="w-5 h-5 lg:w-6 lg:h-6 text-white"
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Replay Audio Button */}
          {currentRound?.isActive && (
            <button
              onClick={() => playAudio(currentRound.targetAudio)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-[#E37100]/90 backdrop-blur-sm rounded-full p-3 shadow-lg hover:bg-[#E37100] transition"
            >
              <Icon name="RiVolumeUpFill" className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Pause Overlay */}
          {gameState.status === "paused" && (
            <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center px-4">
              <div className="bg-[#FDFFF2] backdrop-blur-sm rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-[#BE9D77]/30">
                <Icon
                  name="RiPauseFill"
                  className="w-16 h-16 text-[#BE9D77] mx-auto mb-4"
                />
                <h2 className="text-xl sm:text-2xl font-bold text-[#BE9D77] mb-6">
                  Dijeda
                </h2>
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
              <Icon
                name="RiEmotionSadLine"
                className="w-10 h-10 sm:w-12 sm:h-12 text-red-500"
              />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-[#BE9D77] mb-2">
              Game Over!
            </h2>

            <div className="bg-[#EDD1B0]/30 rounded-xl p-4 my-6 border border-[#BE9D77]/20">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-[#BE9D77]/60 text-xs sm:text-sm">Skor</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#E37100]">
                    {gameState.score}
                  </p>
                </div>
                <div>
                  <p className="text-[#BE9D77]/60 text-xs sm:text-sm">
                    Ronde Selesai
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-green-500">
                    {gameState.roundsCompleted}
                  </p>
                </div>
                <div>
                  <p className="text-[#BE9D77]/60 text-xs sm:text-sm">
                    Level Tercapai
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-[#BE9D77]">
                    {gameState.level}
                  </p>
                </div>
                <div>
                  <p className="text-[#BE9D77]/60 text-xs sm:text-sm">
                    Skor Tertinggi
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-[#EDDD6E]">
                    {gameState.highScore}
                  </p>
                </div>
              </div>
            </div>

            {gameState.score >= gameState.highScore && gameState.score > 0 && (
              <div className="bg-[#EDDD6E]/30 border border-[#EDDD6E] rounded-xl p-3 mb-6">
                <p className="text-[#E37100] font-semibold text-sm sm:text-base">
                  🎉 Skor Tertinggi Baru!
                </p>
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
                  cleanupHandTracking();
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
      `}</style>
    </div>
  );
};

export default TangkapHijaiyahGame;
