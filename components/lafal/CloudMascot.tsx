"use client";

import React from "react";

interface CloudMascotProps {
  isListening?: boolean;
  className?: string;
}

const CloudMascot: React.FC<CloudMascotProps> = ({
  isListening = false,
  className = "",
}) => {
  return (
    <div className={`relative w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 ${className}`}>
      <svg
        viewBox="0 0 200 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Cloud body */}
        <path
          d="M160 100c20-10 25-35 10-50-10-10-25-12-38-5-8-20-30-35-55-30-30 5-50 35-45 65 0 0-22 5-27 25-5 25 15 50 45 50h90c30 0 50-20 50-45 0-15-12-30-30-35z"
          fill="white"
          stroke="#72C5DB"
          strokeWidth="4"
          strokeLinejoin="round"
          className={isListening ? "animate-pulse" : ""}
        />

        {/* Left eye */}
        <ellipse
          cx="75"
          cy="95"
          rx="6"
          ry="7"
          fill="#333333"
        />
        
        {/* Right eye */}
        <ellipse
          cx="115"
          cy="95"
          rx="6"
          ry="7"
          fill="#333333"
        />

        {/* Smile */}
        <path
          d="M80 115 Q95 128 110 115"
          fill="none"
          stroke="#333333"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Blush left (optional, adds cuteness) */}
        <ellipse
          cx="60"
          cy="108"
          rx="8"
          ry="4"
          fill="#FFCCCC"
          opacity="0.5"
        />
        
        {/* Blush right */}
        <ellipse
          cx="130"
          cy="108"
          rx="8"
          ry="4"
          fill="#FFCCCC"
          opacity="0.5"
        />
      </svg>

      {/* Listening animation glow */}
      {isListening && (
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{
            background: "radial-gradient(circle, #72C5DB 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
};

export default CloudMascot;
