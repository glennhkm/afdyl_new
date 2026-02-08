// Speech Recognition Service for Web
// Uses Web Speech API for speech-to-text and calls Afdyl-API for tashkeel

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export type RecognitionStatus =
  | "idle"
  | "listening"
  | "processing"
  | "success"
  | "error";

export interface RecognitionResult {
  status: RecognitionStatus;
  recognizedText: string;
  arabicText: string;
  message: string;
}

type StatusCallback = (result: RecognitionResult) => void;

// Use local Next.js API proxy to avoid CORS issues
const TASHKEEL_API_URL = "/api/tashkeel";

class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private statusCallback: StatusCallback | null = null;
  private currentResult: RecognitionResult = {
    status: "idle",
    recognizedText: "",
    arabicText: "",
    message: "Tekan tombol mikrofon untuk mulai merekam",
  };

  constructor() {
    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    // Check if Web Speech API is supported
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      console.warn("[SpeechService] Web Speech API not supported");
      return;
    }

    this.recognition = new SpeechRecognitionAPI();

    // Configure recognition for Arabic
    this.recognition.lang = "ar-SA"; // Arabic (Saudi Arabia)
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    // Event handlers
    this.recognition.onstart = () => {
      console.log("[SpeechService] 🎙️ Recognition started");
      this.isListening = true;
      this.updateStatus({
        status: "listening",
        recognizedText: "",
        arabicText: "",
        message: "Mendengarkan... Ucapkan dengan jelas",
      });
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      console.log(
        `[SpeechService] 🎯 Result: "${transcript}" (final: ${isFinal})`
      );

      if (isFinal) {
        this.updateStatus({
          status: "processing",
          recognizedText: transcript,
          arabicText: "",
          message: "Memproses hasil recording...",
        });
        this.processRecognizedText(transcript);
      } else {
        this.updateStatus({
          status: "listening",
          recognizedText: transcript,
          arabicText: "",
          message: `Mendengarkan: ${transcript}`,
        });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("[SpeechService] ❌ Error:", event.error);
      this.isListening = false;

      let errorMessage = "Terjadi kesalahan";

      switch (event.error) {
        case "no-speech":
          errorMessage = "Tidak ada suara terdeteksi. Coba lagi!";
          break;
        case "audio-capture":
          errorMessage = "Mikrofon tidak tersedia. Periksa izin mikrofon.";
          break;
        case "not-allowed":
          errorMessage = "Izin mikrofon ditolak. Silakan izinkan akses mikrofon.";
          break;
        case "network":
          errorMessage = "Koneksi jaringan bermasalah.";
          break;
        case "aborted":
          errorMessage = "Recording dibatalkan.";
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }

      this.updateStatus({
        status: "error",
        recognizedText: "",
        arabicText: "",
        message: errorMessage,
      });
    };

    this.recognition.onend = () => {
      console.log("[SpeechService] ⏹️ Recognition ended");
      this.isListening = false;
    };

    console.log("[SpeechService] ✅ Initialized successfully");
  }

  private async processRecognizedText(text: string): Promise<void> {
    if (!text.trim()) {
      this.updateStatus({
        status: "error",
        recognizedText: "",
        arabicText: "",
        message: "Tidak ada suara terdeteksi. Coba lagi!",
      });
      return;
    }

    console.log(`[SpeechService] 🔄 Processing text: "${text}"`);

    try {
      // Call Tashkeel API to add harakat
      const arabicWithHarakat = await this.convertToArabicWithHarakat(text);

      this.updateStatus({
        status: "success",
        recognizedText: text,
        arabicText: arabicWithHarakat,
        message: `Audio terdeteksi: ${text}`,
      });
    } catch (error) {
      console.error("[SpeechService] ❌ Processing error:", error);
      this.updateStatus({
        status: "error",
        recognizedText: text,
        arabicText: `(${text})`,
        message: "Gagal memproses teks. Coba lagi!",
      });
    }
  }

  private async convertToArabicWithHarakat(text: string): Promise<string> {
    console.log(`[SpeechService] 🌐 Calling Tashkeel API for: "${text}"`);

    try {
      const response = await fetch(TASHKEEL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.vocalized_text) {
        console.log(`[SpeechService] ✅ Tashkeel result: "${data.vocalized_text}"`);
        return data.vocalized_text;
      }

      // Fallback: return original text in parentheses
      return `(${text})`;
    } catch (error) {
      console.error("[SpeechService] ❌ Tashkeel API error:", error);
      // Fallback: return original text in parentheses
      return `(${text})`;
    }
  }

  private updateStatus(result: RecognitionResult): void {
    this.currentResult = result;
    if (this.statusCallback) {
      this.statusCallback(result);
    }
  }

  // Public methods

  public isSupported(): boolean {
    return typeof window !== "undefined" && 
           (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);
  }

  public onStatusChange(callback: StatusCallback): void {
    this.statusCallback = callback;
  }

  public startListening(): void {
    if (!this.recognition) {
      this.updateStatus({
        status: "error",
        recognizedText: "",
        arabicText: "",
        message: "Speech recognition tidak didukung di browser ini.",
      });
      return;
    }

    if (this.isListening) {
      console.log("[SpeechService] Already listening, stopping first...");
      this.recognition.stop();
    }

    console.log("[SpeechService] 🎙️ Starting listening...");
    this.recognition.start();
  }

  public stopListening(): void {
    if (!this.recognition || !this.isListening) return;

    console.log("[SpeechService] 🛑 Stopping listening...");
    this.recognition.stop();
  }

  public getStatus(): RecognitionResult {
    return this.currentResult;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public reset(): void {
    this.currentResult = {
      status: "idle",
      recognizedText: "",
      arabicText: "",
      message: "Tekan tombol mikrofon untuk mulai merekam",
    };
    if (this.statusCallback) {
      this.statusCallback(this.currentResult);
    }
  }
}

// Singleton instance
let serviceInstance: SpeechRecognitionService | null = null;

export const getSpeechRecognitionService = (): SpeechRecognitionService => {
  if (!serviceInstance) {
    serviceInstance = new SpeechRecognitionService();
  }
  return serviceInstance;
};
