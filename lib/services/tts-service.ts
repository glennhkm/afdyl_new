// Text-to-Speech Service for Web
// Uses Web Speech Synthesis API with Google TTS fallback for Arabic

type SpeakingCallback = (isSpeaking: boolean) => void;

// Local TTS proxy API endpoint
const TTS_PROXY_URL = "/api/tts";

class TTSService {
  private synthesis: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isSpeaking: boolean = false;
  private speakingCallback: SpeakingCallback | null = null;
  private voicesLoaded: boolean = false;
  private voicesLoadedPromise: Promise<void> | null = null;
  private useGoogleTTS: boolean = false; // Flag to use Google TTS fallback

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === "undefined") {
      console.warn("[TTSService] Window not available");
      return;
    }

    this.synthesis = window.speechSynthesis;

    if (!this.synthesis) {
      console.warn("[TTSService] Speech Synthesis not supported, will use Google TTS");
      this.useGoogleTTS = true;
    } else {
      // Load voices - this is asynchronous in most browsers
      this.voicesLoadedPromise = this.loadVoices();
    }

    // Create audio element for Google TTS fallback
    this.audioElement = new Audio();
    this.audioElement.addEventListener("play", () => {
      console.log("[TTSService] 🔊 Audio playing");
      this.updateSpeakingState(true);
    });
    this.audioElement.addEventListener("ended", () => {
      console.log("[TTSService] ✅ Audio ended");
      this.updateSpeakingState(false);
    });
    this.audioElement.addEventListener("error", (e) => {
      console.error("[TTSService] ❌ Audio error:", e);
      this.updateSpeakingState(false);
    });

    console.log("[TTSService] ✅ Initialized successfully");
  }

  private loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve();
        return;
      }

      // Try to get voices immediately
      const voices = this.synthesis.getVoices();
      if (voices.length > 0) {
        this.voicesLoaded = true;
        this.checkArabicSupport(voices);
        console.log(`[TTSService] 🔊 ${voices.length} voices loaded immediately`);
        resolve();
        return;
      }

      // Wait for voiceschanged event (Chrome, Edge)
      const handleVoicesChanged = () => {
        const loadedVoices = this.synthesis?.getVoices() || [];
        console.log(`[TTSService] 🔊 ${loadedVoices.length} voices loaded via event`);
        this.voicesLoaded = true;
        this.checkArabicSupport(loadedVoices);
        this.synthesis?.removeEventListener("voiceschanged", handleVoicesChanged);
        resolve();
      };

      this.synthesis.addEventListener("voiceschanged", handleVoicesChanged);

      // Fallback timeout in case voiceschanged never fires
      setTimeout(() => {
        if (!this.voicesLoaded) {
          console.log("[TTSService] ⚠️ Voices loading timeout, will use Google TTS");
          this.voicesLoaded = true;
          this.useGoogleTTS = true;
          resolve();
        }
      }, 2000);
    });
  }

  private checkArabicSupport(voices: SpeechSynthesisVoice[]): void {
    const arabicVoice = voices.find(
      (voice) =>
        voice.lang.startsWith("ar") ||
        voice.name.toLowerCase().includes("arabic") ||
        voice.name.toLowerCase().includes("arab")
    );

    if (!arabicVoice) {
      console.log("[TTSService] ⚠️ No Arabic voice available, will use Google TTS fallback");
      this.useGoogleTTS = true;
    } else {
      console.log(`[TTSService] ✅ Arabic voice available: ${arabicVoice.name}`);
    }
  }

  public isSupported(): boolean {
    return typeof window !== "undefined";
  }

  public onSpeakingChange(callback: SpeakingCallback): void {
    this.speakingCallback = callback;
  }

  private updateSpeakingState(speaking: boolean): void {
    this.isSpeaking = speaking;
    if (this.speakingCallback) {
      this.speakingCallback(speaking);
    }
  }

  public async speak(text: string): Promise<void> {
    if (!text.trim()) {
      console.warn("[TTSService] Empty text, nothing to speak");
      return;
    }

    // Wait for voices to be loaded
    if (this.voicesLoadedPromise) {
      await this.voicesLoadedPromise;
    }

    // Stop any ongoing speech
    this.stop();

    console.log(`[TTSService] 🔊 Speaking: "${text}"`);
    console.log(`[TTSService] Using ${this.useGoogleTTS ? "Google TTS" : "Web Speech API"}`);

    if (this.useGoogleTTS) {
      await this.speakWithGoogleTTS(text);
    } else {
      await this.speakWithWebSpeech(text);
    }
  }

  private async speakWithGoogleTTS(text: string): Promise<void> {
    if (!this.audioElement) {
      console.error("[TTSService] Audio element not available");
      return;
    }

    try {
      // Build proxy URL
      const url = `${TTS_PROXY_URL}?text=${encodeURIComponent(text)}&lang=ar`;
      
      console.log("[TTSService] 🌐 Fetching Google TTS audio...");
      
      this.audioElement.src = url;
      this.audioElement.load();
      
      // Play audio
      await this.audioElement.play();
    } catch (error) {
      console.error("[TTSService] ❌ Google TTS error:", error);
      this.updateSpeakingState(false);
    }
  }

  private async speakWithWebSpeech(text: string): Promise<void> {
    if (!this.synthesis) {
      console.error("[TTSService] Speech Synthesis not available");
      // Fallback to Google TTS
      await this.speakWithGoogleTTS(text);
      return;
    }

    // Create utterance
    this.utterance = new SpeechSynthesisUtterance(text);

    // Get available voices
    const voices = this.synthesis.getVoices();
    console.log(`[TTSService] Available voices: ${voices.length}`);

    // Try to find Arabic voice
    const arabicVoice = voices.find(
      (voice) =>
        voice.lang.startsWith("ar") ||
        voice.name.toLowerCase().includes("arabic") ||
        voice.name.toLowerCase().includes("arab")
    );

    if (arabicVoice) {
      this.utterance.voice = arabicVoice;
      this.utterance.lang = arabicVoice.lang;
      console.log(`[TTSService] Using Arabic voice: ${arabicVoice.name} (${arabicVoice.lang})`);
    } else {
      // No Arabic voice, fallback to Google TTS
      console.log("[TTSService] No Arabic voice, falling back to Google TTS");
      await this.speakWithGoogleTTS(text);
      return;
    }

    // Configure speech
    this.utterance.rate = 0.8;
    this.utterance.pitch = 1.0;
    this.utterance.volume = 1.0;

    // Track if speech actually started
    let speechStarted = false;

    // Event handlers
    this.utterance.onstart = () => {
      console.log("[TTSService] ▶️ Speech started");
      speechStarted = true;
      this.updateSpeakingState(true);
    };

    this.utterance.onend = () => {
      console.log("[TTSService] ✅ Speech ended");
      this.updateSpeakingState(false);
    };

    this.utterance.onerror = async (event) => {
      console.error("[TTSService] ❌ Speech error:", event.error);
      this.updateSpeakingState(false);
      
      // Fallback to Google TTS on error
      if (event.error !== "canceled") {
        console.log("[TTSService] Falling back to Google TTS due to error");
        await this.speakWithGoogleTTS(text);
      }
    };

    // Chrome workaround
    this.synthesis.cancel();
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log("[TTSService] 🎯 Calling synthesis.speak()...");
    this.synthesis.speak(this.utterance);

    // Resume if paused
    if (this.synthesis.paused) {
      console.log("[TTSService] ⚠️ Synthesis was paused, resuming...");
      this.synthesis.resume();
    }

    // Fallback check: if speech doesn't start within 1 second, use Google TTS
    setTimeout(async () => {
      if (!speechStarted && !this.isSpeaking) {
        console.log("[TTSService] ⚠️ Speech failed to start, falling back to Google TTS");
        this.synthesis?.cancel();
        await this.speakWithGoogleTTS(text);
      }
    }, 1000);
  }

  public stop(): void {
    // Stop Web Speech
    if (this.synthesis) {
      this.synthesis.cancel();
    }

    // Stop audio element
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }

    this.updateSpeakingState(false);
  }

  public pause(): void {
    if (this.synthesis) {
      this.synthesis.pause();
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  public resume(): void {
    if (this.synthesis) {
      this.synthesis.resume();
    }
    if (this.audioElement) {
      this.audioElement.play();
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  public getArabicVoices(): SpeechSynthesisVoice[] {
    return this.getVoices().filter(
      (voice) =>
        voice.lang.startsWith("ar") ||
        voice.name.toLowerCase().includes("arabic")
    );
  }
}

// Singleton instance
let serviceInstance: TTSService | null = null;

export const getTTSService = (): TTSService => {
  if (!serviceInstance) {
    serviceInstance = new TTSService();
  }
  return serviceInstance;
};
