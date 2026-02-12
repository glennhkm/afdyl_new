"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Topbar from "@/components/topbar";
import Icon from "@/components/Icon";
import CloudMascot from "@/components/lafal/CloudMascot";
import RecordingButton from "@/components/lafal/RecordingButton";
import {
  lafalPrompts,
  LafalPrompt,
} from "@/lib/data/lafal-prompts";
import {
  getSpeechRecognitionService,
  RecognitionResult,
  RecognitionStatus,
} from "@/lib/services/speech-recognition-service";
import { getTTSService } from "@/lib/services/tts-service";
import { usePullToRefresh } from "@/contexts/PullToRefreshContext";

const LafalHijaiyahPage = () => {
  const { disablePullToRefresh, enablePullToRefresh } = usePullToRefresh();

  // Disable pull-to-refresh when component mounts (speech recording page)
  useEffect(() => {
    disablePullToRefresh();
    return () => {
      enablePullToRefresh();
    };
  }, [disablePullToRefresh, enablePullToRefresh]);

  // Current prompt state
  const [currentPrompt] = useState<LafalPrompt>(
    lafalPrompts[0],
  );

  // Speech recognition state
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [arabicText, setArabicText] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    "Tekan tombol mikrofon untuk mulai merekam",
  );

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Browser support
  const [isSupported, setIsSupported] = useState(true);

  // Refs
  const speechServiceRef = useRef<ReturnType<
    typeof getSpeechRecognitionService
  > | null>(null);
  const ttsServiceRef = useRef<ReturnType<typeof getTTSService> | null>(null);

  // Initialize services
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize speech recognition service
    speechServiceRef.current = getSpeechRecognitionService();

    const supported = speechServiceRef.current.isSupported();
    if (!supported) {
      // Using callback form to avoid synchronous setState warning
      requestAnimationFrame(() => {
        setIsSupported(false);
        setStatusMessage(
          "Speech recognition tidak didukung di browser ini. Gunakan Chrome atau Edge.",
        );
      });
      return;
    }

    // Subscribe to status changes
    speechServiceRef.current.onStatusChange((result: RecognitionResult) => {
      setStatus(result.status);
      setArabicText(result.arabicText);
      setStatusMessage(result.message);
      setIsListening(result.status === "listening");
      setIsProcessing(result.status === "processing");
    });

    // Initialize TTS service
    ttsServiceRef.current = getTTSService();
    ttsServiceRef.current.onSpeakingChange((speaking) => {
      setIsSpeaking(speaking);
    });

    return () => {
      // Cleanup
      if (speechServiceRef.current) {
        speechServiceRef.current.stopListening();
      }
      if (ttsServiceRef.current) {
        ttsServiceRef.current.stop();
      }
    };
  }, []);

  // Handle recording toggle
  const handleRecordingToggle = useCallback(() => {
    if (!speechServiceRef.current) return;

    if (isListening) {
      speechServiceRef.current.stopListening();
    } else {
      // Reset previous result when starting new recording
      setArabicText("");
      speechServiceRef.current.startListening();
    }
  }, [isListening]);

  // Handle TTS toggle
  const handleTTSToggle = useCallback(() => {
    if (!ttsServiceRef.current || !arabicText) return;

    if (isSpeaking) {
      ttsServiceRef.current.stop();
    } else {
      ttsServiceRef.current.speak(arabicText);
    }
  }, [arabicText, isSpeaking]);

  // Determine status color
  const getStatusColor = () => {
    if (status === "error") return "bg-red-50 border-red-200 text-red-700";
    if (status === "success")
      return "bg-green-50 border-green-200 text-green-700";
    if (status === "listening" || status === "processing")
      return "bg-blue-50 border-blue-200 text-blue-700";
    return "bg-amber-50 border-amber-200 text-amber-900";
  };

  const getStatusIcon = ():
    | "RiErrorWarningLine"
    | "RiCheckLine"
    | "RiMicLine"
    | "RiLoader4Line"
    | "RiLightbulbLine" => {
    if (status === "error") return "RiErrorWarningLine";
    if (status === "success") return "RiCheckLine";
    if (status === "listening") return "RiMicLine";
    if (status === "processing") return "RiLoader4Line";
    return "RiLightbulbLine";
  };

  return (
    <div className="w-full min-h-[82svh] pb-6 sm:pb-8 pt-20 md:pt-44 lg:pt-0 overflow-x-hidden">
      <Topbar title="Lafal Hijaiyah" />

      <div className="flex flex-col items-center gap-4 sm:gap-6 max-w-2xl mx-auto px-2 sm:px-4">
        {/* Prompt card */}
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white rounded-xl p-3 sm:p-4 shadow-sm">
          <div className="flex-1 w-full sm:w-auto">
            <p className="text-gray-600 text-xs sm:text-sm mb-1">Coba Ucapkan</p>
            <p className="text-lg sm:text-xl font-semibold text-gray-800">
              {currentPrompt.text}..
            </p>
            <p className="text-xs text-gray-400 mt-1">({currentPrompt.hint})</p>
          </div>

          {/* Tips box (only show in idle state) */}
          {status === "idle" && (
            <div
              className={`w-full sm:flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl border ${getStatusColor()}`}
            >
              <div className="flex items-start gap-2">
                <Icon
                  name={getStatusIcon()}
                  className="text-amber-700 mt-0.5 shrink-0"
                  size={16}
                />
                <p className="text-xs sm:text-sm flex-1">
                  Tips: Tekan tombol mikrofon, tunggu 1-2 detik, lalu ucapkan
                  dengan jelas.
                </p>
              </div>
            </div>
          )}

          {/* Status message (when not idle) */}
          {status !== "idle" && (
            <div className={`w-full sm:flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl border ${getStatusColor()}`}>
              <div className="flex items-start gap-2">
                <Icon
                  name={getStatusIcon()}
                  className={`shrink-0 ${status === "processing" ? "animate-pulse" : ""}`}
                  size={16}
                />
                <p className="text-xs sm:text-sm flex-1">{statusMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Cloud mascot */}
        {status !== "success" && (
          <div className="py-2 sm:py-4">
            <CloudMascot isListening={isListening} />
          </div>
        )}

        {/* Result section (when arabic text is available) */}
        {arabicText && status === "success" && (
          <div className="w-full bg-white rounded-xl p-3 sm:p-4 shadow-sm text-center">
            <p className="text-gray-500 text-xs sm:text-sm mb-2">Hasil dari Audio Anda:</p>
            <p
              className="text-2xl sm:text-3xl leading-loose text-gray-800"
              style={{ fontFamily: "var(--font-maqroo), serif" }}
              dir="rtl"
            >
              {arabicText}
            </p>

            {/* TTS button */}
            <button
              onClick={handleTTSToggle}
              className={`mt-3 sm:mt-4 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full flex items-center justify-center gap-2 mx-auto transition-colors text-sm ${
                isSpeaking
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-[#C98151] hover:bg-[#b5724a] text-white"
              }`}
            >
              <Icon
                name={isSpeaking ? "RiStopFill" : "RiVolumeUpFill"}
                size={16}
              />
              <span className="text-xs sm:text-sm">
                {isSpeaking ? "Hentikan" : "Dengarkan"}
              </span>
            </button>
          </div>
        )}

        {/* Browser not supported message */}
        {!isSupported && (
          <div className="w-full p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg sm:rounded-xl">
            <div className="flex items-start gap-2 sm:gap-3">
              <Icon
                name="RiErrorWarningLine"
                className="text-yellow-600 mt-0.5 shrink-0"
                size={18}
              />
              <div>
                <p className="font-medium text-yellow-800 text-sm sm:text-base">
                  Browser tidak didukung
                </p>
                <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                  Fitur speech recognition membutuhkan browser Chrome, Edge,
                  atau Safari terbaru.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recording button */}
        <div className="mt-2 sm:mt-4">
          <RecordingButton
            isListening={isListening}
            isProcessing={isProcessing}
            onClick={handleRecordingToggle}
            disabled={!isSupported}
          />
        </div>
      </div>
    </div>
  );
};

export default LafalHijaiyahPage;
