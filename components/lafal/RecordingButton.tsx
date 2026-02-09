"use client";

import React from "react";
import Icon from "@/components/Icon";

interface RecordingButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const RecordingButton: React.FC<RecordingButtonProps> = ({
  isListening,
  isProcessing,
  onClick,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4">
      {/* Audio visualizer bars */}
      <div className="flex items-end justify-center gap-0.5 sm:gap-1 h-8 sm:h-10 mb-1 sm:mb-2">
        {[15, 25, 35, 40, 30, 20, 18].map((height, index) => (
          <div
            key={index}
            className={`w-0.5 sm:w-1 rounded-sm transition-all duration-300 ${
              isListening
                ? "bg-[#D4C785]/80 animate-pulse"
                : "bg-[#D4C785]/40"
            }`}
            style={{
              height: isListening ? `${height * 0.8}px` : `${height * 0.25}px`,
              animationDelay: `${index * 100}ms`,
            }}
          />
        ))}
      </div>

      {/* Recording button */}
      <button
        onClick={onClick}
        disabled={disabled || isProcessing}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
          isListening
            ? "bg-[#C98151] hover:bg-[#b5724a]"
            : "bg-[#D4C785] hover:bg-[#c4b775]"
        } ${
          disabled || isProcessing
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer active:scale-95"
        }`}
      >
        {isProcessing ? (
          /* Loading pulsing dots */
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#C98151] rounded-full animate-pulse" />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#C98151] rounded-full animate-pulse [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#C98151] rounded-full animate-pulse [animation-delay:0.4s]" />
          </div>
        ) : isListening ? (
          /* Stop icon (square) */
          <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-sm" />
        ) : (
          /* Microphone icon */
          <Icon
            name="RiMicFill"
            className="text-[#C98151] w-5 h-5 sm:w-6 sm:h-6"
          />
        )}
      </button>

      {/* Status text below button */}
      <p className="text-xs sm:text-sm text-gray-500 text-center">
        {isProcessing
          ? "Memproses..."
          : isListening
          ? "Tekan untuk berhenti"
          : "Tekan untuk merekam"}
      </p>
    </div>
  );
};

export default RecordingButton;
