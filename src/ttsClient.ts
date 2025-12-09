// // will hold Azure TTS logic
// export class TTSClient {
//   private apiKey: string;
//   private region: string;
//   private endpoint: string;

//   constructor(apiKey: string, region: string, endpoint: string) {
//     this.apiKey = apiKey;
//     this.region = region;
//     this.endpoint = endpoint;
//   }

//   async synthesize(text: string): Promise<Buffer> {
//     // TODO: Implement Azure TTS synthesis
//     console.log('TTS Client: Synthesizing text to speech...');
//     return Buffer.from('');
//   }

//   async synthesizeStream(
//     text: string,
//     onChunk: (audioChunk: Buffer) => void
//   ): Promise<void> {
//     // TODO: Implement streaming TTS synthesis
//     console.log('TTS Client: Streaming text to speech...');
//   }
// }
//----------------------------------------------------------------------------
// import "dotenv/config";
// import fetch, { Headers } from "node-fetch";

// const azureKey = process.env.AZURE_SPEECH_KEY;
// const azureRegion = process.env.AZURE_SPEECH_REGION;

// if (!azureKey || !azureRegion) {
//   throw new Error("AZURE_SPEECH_KEY or AZURE_SPEECH_REGION not set in .env");
// }

// // Pick an Indian voice (you can change this later)
// const VOICE_NAME = "en-IN-NeerjaNeural"; 
// // You can also try a Hindi voice like: "hi-IN-SwaraNeural"

// export async function synthesizeSpeech(text: string): Promise<Buffer> {
//   const endpoint = `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;

//   const headers = new Headers();
//   headers.append("Ocp-Apim-Subscription-Key", azureKey);
//   headers.append("Content-Type", "application/ssml+xml");
//   // MP3 output for easy playback
//   headers.append("X-Microsoft-OutputFormat", "audio-16khz-32kbitrate-mono-mp3");
//   headers.append("User-Agent", "admissions-voice-agent");

//   // Simple SSML: you can adjust rate, pitch, style later if you want
//   const ssml = `
// <speak version="1.0" xml:lang="en-IN">
//   <voice name="${VOICE_NAME}">
//     <prosody rate="0%">
//       ${escapeXml(text)}
//     </prosody>
//   </voice>
// </speak>`.trim();

//   const response = await fetch(endpoint, {
//     method: "POST",
//     headers,
//     body: ssml,
//   });

//   if (!response.ok) {
//     const errText = await response.text();
//     console.error("Azure TTS error:", response.status, errText);
//     throw new Error(`Azure TTS failed: ${response.status} - ${errText}`);
//   }

//   const arrayBuffer = await response.arrayBuffer();
//   return Buffer.from(arrayBuffer);
// }

// // Basic XML escape for safety
// function escapeXml(unsafe: string): string {
//   return unsafe
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&apos;");
// }
//----------------------------------------------------------------------------
import "dotenv/config";
import fetch, { Headers } from "node-fetch";
// const { SarvamAIClient } = require("sarvamai");
import { SarvamAIClient } from "sarvamai";
// const elevenApiKey = process.env.ELEVENLABS_API_KEY;
// const elevenVoiceId =
//   process.env.ELEVENLABS_VOICE_ID || "1qEiC6qsybMkmnNdVMbK"; // Monika Sogam – Hindi Modulated

// if (!elevenApiKey) {
//   throw new Error("ELEVENLABS_API_KEY not set in .env");
// }

// const MODEL_ID = "eleven_multilingual_v2"; // good quality, multilingual model :contentReference[oaicite:4]{index=4}

/**
 * Convert text to speech using ElevenLabs TTS with Monika Sogam voice.
 * Returns an MP3 Buffer.
 */
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  // const url = `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}`;

  // const headers = new Headers();
  // headers.append("xi-api-key", elevenApiKey);
  // headers.append("Content-Type", "application/json");
  // headers.append("Accept", "audio/mpeg"); // we’ll play as mp3 in browser

  // const body = {
  //   text,
  //   model_id: MODEL_ID,
  //   voice_settings: {
  //     stability: 0.6,
  //     similarity_boost: 0.8,
  //     style: 0.3,
  //     use_speaker_boost: true,
  //   },
  // };

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error("SARVAM_API_KEY not set in .env");
  }

  const client = new SarvamAIClient({
    apiSubscriptionKey: apiKey
  });

  // const elevenApiKey = process.env.ELEVENLABS_API_KEY;
  const response = await client.textToSpeech.convert({
    // text: "",
    text: text,
    target_language_code: "hi-IN",
    speaker: "anushka",
    pitch: 0,
    pace: 1,
    loudness: 1,
    speech_sample_rate: 22050,
    enable_preprocessing: true,
    model: "bulbul:v2"
  });
  // const response = await fetch(url, {
  //   method: "POST",
  //   headers,
  //   body: JSON.stringify(body),
  // });

  if (!response.audios || response.audios.length === 0 || !response.audios[0]) {
    throw new Error("SarvamAI TTS failed: No audio data received");
  }

  // The audios array contains base64 encoded strings
  const base64Audio = response.audios[0];
  return Buffer.from(base64Audio, "base64");
}

// console.log(response);