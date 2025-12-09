// // will hold Deepgram streaming logic
// import { WebSocket } from 'ws';

// export class STTClient {
//   private ws: WebSocket | null = null;
//   private apiKey: string;

//   constructor(apiKey: string) {
//     this.apiKey = apiKey;
//   }

//   async connect(): Promise<void> {
//     // TODO: Implement Deepgram WebSocket connection
//     console.log('STT Client: Connecting to Deepgram...');
//   }

//   async sendAudio(audioData: Buffer): Promise<void> {
//     // TODO: Implement audio streaming to Deepgram
//     console.log('STT Client: Sending audio data...');
//   }

//   onTranscript(callback: (text: string) => void): void {
//     // TODO: Implement transcript callback
//     console.log('STT Client: Setting up transcript callback...');
//   }

//   disconnect(): void {
//     if (this.ws) {
//       this.ws.close();
//       this.ws = null;
//     }
//   }
// }
//------------------------------------
// import { Deepgram } from "@deepgram/sdk";

// const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
// if (!deepgramApiKey) {
//   throw new Error("DEEPGRAM_API_KEY not set in .env");
// }

// const deepgram = new Deepgram(deepgramApiKey);

// // Define types for callbacks
// export interface SttCallbacks {
//   onTranscript: (text: string, isFinal: boolean) => void;
//   onError?: (err: Error) => void;
//   onClose?: () => void;
// }

// export interface SttSession {
//   sendAudio: (chunk: Buffer) => void;
//   close: () => void;
// }

// /**
//  * Create a streaming STT session.
//  * - audio is 16-bit PCM, mono, 16k-48k Hz (we'll downsample if needed later)
//  * - we get partial + final transcripts via callbacks
//  */
// export async function createSttSession(callbacks: SttCallbacks): Promise<SttSession> {
//   const { onTranscript, onError, onClose } = callbacks;

//   // Deepgram SDK provides .transcription.live
//   const dgConnection = deepgram.transcription.live({
//     model: "nova-2",          // or "nova-2-general" depending on account
//     language: "en",           // works with Hinglish too; you can experiment with "hi" etc.
//     encoding: "linear16",     // PCM 16-bit
//     sample_rate: 48000,       // we'll pretend this, or set to your AudioContext sample rate
//     channels: 1,
//     interim_results: true,    // so we get partial results
//   });

//   dgConnection.addListener("open", () => {
//     console.log("Deepgram STT connection opened");
//   });

//   dgConnection.addListener("error", (error: any) => {
//     console.error("Deepgram STT error:", error);
//     onError?.(error instanceof Error ? error : new Error(String(error)));
//   });

//   dgConnection.addListener("close", () => {
//     console.log("Deepgram STT connection closed");
//     onClose?.();
//   });

//   dgConnection.addListener("transcriptReceived", (dgData: any) => {
//     // Deepgram returns a nested JSON; we extract the transcript
//     try {
//       const results = dgData.channel?.alternatives?.[0];
//       if (!results) return;

//       const transcript: string = results.transcript || "";
//       if (!transcript) return;

//       const isFinal = !dgData.is_final ? false : true;

//       onTranscript(transcript, isFinal);
//     } catch (err) {
//       console.error("Error parsing Deepgram transcript:", err);
//     }
//   });

//   return {
//     sendAudio: (chunk: Buffer) => {
//       dgConnection.send(chunk);
//     },
//     close: () => {
//       dgConnection.finish(); // tells Deepgram no more audio
//     },
//   };
// }
//--------------------------
// src/sttClient.ts
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

// Define types for callbacks
export interface SttCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
}

export interface SttSession {
  sendAudio: (chunk: Buffer) => void;
  close: () => void;
}

/**
 * Create a streaming STT session.
 * - audio is 16-bit PCM, mono, 16k-48k Hz (we'll downsample if needed later)
 * - we get partial + final transcripts via callbacks
 */
export async function createSttSession(
  callbacks: SttCallbacks
): Promise<SttSession> {
  // Check API key when function is called (after dotenv.config() has run)
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramApiKey) {
    throw new Error("DEEPGRAM_API_KEY not set in .env");
  }

  // v3+ style: use createClient instead of `new Deepgram(...)`
  const deepgram = createClient(deepgramApiKey);

  const { onTranscript, onError, onClose } = callbacks;

  // Deepgram v3 SDK: use listen.live instead of transcription.live
  const dgConnection = deepgram.listen.live({
    model: "nova-2",      // adjust model if needed (nova-3, flux, etc.)
    language: "en",       // you can experiment with "hi", "en-IN", etc.
    encoding: "linear16", // PCM 16-bit
    sample_rate: 48000,   // match your frontend AudioContext sample rate
    channels: 1,
    interim_results: true,
    smart_format: true,
  });

  // Events use LiveTranscriptionEvents enum in v3
  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log("Deepgram STT connection opened");
  });

  dgConnection.on(LiveTranscriptionEvents.Error, (error: any) => {
    console.error("Deepgram STT error:", error);
    onError?.(error instanceof Error ? error : new Error(String(error)));
  });

  dgConnection.on(LiveTranscriptionEvents.Close, () => {
    console.log("Deepgram STT connection closed");
    onClose?.();
  });

  dgConnection.on(
    LiveTranscriptionEvents.Transcript,
    (dgData: any) => {
      try {
        const alt = dgData.channel?.alternatives?.[0];
        if (!alt) return;

        const transcript: string = alt.transcript || "";
        if (!transcript) return;

        const isFinal: boolean = !!dgData.is_final;
        onTranscript(transcript, isFinal);
      } catch (err) {
        console.error("Error parsing Deepgram transcript:", err);
      }
    }
  );

  return {
    sendAudio: (chunk: Buffer) => {
      try {
        // Convert Buffer to ArrayBuffer for Deepgram SDK compatibility
        const arrayBuffer = chunk.buffer.slice(
          chunk.byteOffset,
          chunk.byteOffset + chunk.byteLength
        );
        dgConnection.send(arrayBuffer);
      } catch (err) {
        console.error("Error sending audio to Deepgram:", err);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    close: () => {
      // Send CloseStream message to properly close the connection
      // This ensures all audio data is processed and final transcripts are returned
      dgConnection.send(JSON.stringify({ type: "CloseStream" }));
    },
  };
}
