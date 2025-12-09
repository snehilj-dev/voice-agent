// // main entry for WebSocket server
// import { WebSocketServer, WebSocket } from 'ws';
// import { createServer } from 'http';
// import { readFileSync } from 'fs';
// import { join } from 'path';
// import dotenv from 'dotenv';

// dotenv.config();

// const PORT = process.env.PORT || 3000;

// // Create HTTP server
// const server = createServer((req, res) => {
//   if (req.url === '/') {
//     const html = readFileSync(join(process.cwd(), 'public', 'index.html'), 'utf-8');
//     res.writeHead(200, { 'Content-Type': 'text/html' });
//     res.end(html);
//   } else {
//     res.writeHead(404);
//     res.end('Not found');
//   }
// });

// // Create WebSocket server
// const wss = new WebSocketServer({ server });

// wss.on('connection', (ws: WebSocket) => {
//   console.log('Client connected');

//   ws.on('message', (message: Buffer) => {
//     // Handle incoming messages from client
//     console.log('Received message:', message.toString());
//   });

//   ws.on('close', () => {
//     console.log('Client disconnected');
//   });

//   ws.on('error', (error) => {
//     console.error('WebSocket error:', error);
//   });
// });

// server.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

// import * as dotenv from "dotenv";
// dotenv.config();

// import { WebSocketServer } from "ws";

// const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// const wss = new WebSocketServer({ port: PORT });

// wss.on("connection", (ws) => {
//   console.log("New WebSocket connection");

//   ws.on("message", (data) => {
//     console.log("Received from client:", data.toString());
//     // For now, just echo back
//     ws.send(`Server echo: ${data}`);
//   });

//   ws.on("close", () => {
//     console.log("WebSocket connection closed");
//   });
// });

// console.log(`WebSocket server listening on ws://localhost:${PORT}`);
//------------
// import * as dotenv from "dotenv";
// dotenv.config();

// import { WebSocketServer, WebSocket } from "ws";

// const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// const wss = new WebSocketServer({ port: PORT });

// wss.on("connection", (ws: WebSocket) => {
//   console.log("New WebSocket connection");

//   ws.on("message", (data) => {
//     if (typeof data === "string") {
//       console.log("Received text from client:", data);
//       ws.send(`Server echo: ${data}`);
//     } else if (data instanceof Buffer) {
//       // Binary data (our PCM audio chunk)
//       console.log("Received binary audio chunk, length:", data.length);
//       // For now, do nothing else.
//     } else {
//       console.log("Received unknown data type");
//     }
//   });

//   ws.on("close", () => {
//     console.log("WebSocket connection closed");
//   });
// });

// console.log(`WebSocket server listening on ws://localhost:${PORT}`);
// -------------
// import * as dotenv from "dotenv";
// dotenv.config();

// import { WebSocketServer, WebSocket, RawData } from "ws";

// const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// const wss = new WebSocketServer({ port: PORT });

// wss.on("connection", (ws: WebSocket) => {
//   console.log("New WebSocket connection");

//   ws.on("message", (data: RawData) => {
//     // Log what we actually received
//     const typeDesc =
//       Buffer.isBuffer(data)
//         ? "Buffer"
//         : data instanceof ArrayBuffer
//         ? "ArrayBuffer"
//         : Array.isArray(data)
//         ? "Buffer[]"
//         : typeof data;

//     console.log("Received message type:", typeDesc);

//     if (typeof data === "string") {
//       console.log("Received TEXT from client:", data);
//       // (Optional) Comment this out so it doesn't confuse you while testing audio
//       // ws.send(`Server echo: ${data}`);
//     } else if (Buffer.isBuffer(data)) {
//       console.log("Received BINARY audio chunk, length:", data.length);
//       // here later we will forward this Buffer to STT
//     } else if (data instanceof ArrayBuffer) {
//       const buf = Buffer.from(data);
//       console.log("Received ArrayBuffer audio chunk, length:", buf.length);
//       // forward buf to STT later
//     } else if (Array.isArray(data)) {
//       // Rare case: array of Buffers
//       const totalLen = data.reduce((sum, b) => sum + b.length, 0);
//       console.log("Received Buffer[] audio chunks, total length:", totalLen);
//     } else {
//       console.log("Received unknown data type");
//     }
//   });

//   ws.on("close", () => {
//     console.log("WebSocket connection closed");
//   });
// });

// console.log(`WebSocket server listening on ws://localhost:${PORT}`);
//-----------------

import * as dotenv from "dotenv";
dotenv.config();

import { WebSocketServer, WebSocket } from "ws";
import type { RawData } from "ws";
import { createSttSession } from "./sttClient.js";
import type { SttSession } from "./sttClient.js";
import { createInitialCounselorContext, getCounselorReply } from "./llmClient.js";
import type { CounselorContext } from "./llmClient.js";
import { synthesizeSpeech } from "./ttsClient.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const wss = new WebSocketServer({ port: PORT });
wss.on("connection", async (ws: WebSocket) => {
  console.log("New WebSocket connection");

  let sttSession: SttSession | null = null;
  let counselorCtx: CounselorContext = createInitialCounselorContext();

  // Create STT session per connection
  try {
    sttSession = await createSttSession({
      // onTranscript: (text, isFinal) => {
      //   console.log(`STT transcript (${isFinal ? "final" : "partial"}):`, text);

      //   ws.send(
      //     JSON.stringify({
      //       type: "stt_transcript",
      //       text,
      //       isFinal,
      //     })
      //   );
      // },
      // onTranscript: async (text, isFinal) => {
      //   console.log(`STT transcript (${isFinal ? "final" : "partial"}):`, text);

      //   // 1) Send STT transcript to frontend (for debugging/logging)
      //   ws.send(
      //     JSON.stringify({
      //       type: "stt_transcript",
      //       text,
      //       isFinal,
      //     })
      //   );

      //   // 2) Only trigger LLM on final transcripts
      //   if (isFinal) {
      //     try {
      //       const { reply, updatedContext } = await getCounselorReply(counselorCtx, text);
      //       counselorCtx = updatedContext;

      //       console.log("LLM reply:", reply);

      //       // Send the reply text to frontend
      //       ws.send(
      //         JSON.stringify({
      //           type: "llm_reply",
      //           text: reply,
      //         })
      //       );
      //     } catch (err: any) {
      //       console.error("LLM error:", err);
      //       ws.send(
      //         JSON.stringify({
      //           type: "llm_error",
      //           error: err?.message ?? String(err),
      //         })
      //       );
      //     }
      //   }
      // },
      onTranscript: async (text, isFinal) => {
        console.log(`STT transcript (${isFinal ? "final" : "partial"}):`, text);

        // 1) Send STT transcript to frontend (for logging)
        ws.send(
          JSON.stringify({
            type: "stt_transcript",
            text,
            isFinal,
          })
        );

        // 2) Only trigger LLM on final transcripts
        if (isFinal) {
          try {
            const { reply, updatedContext } = await getCounselorReply(counselorCtx, text);
            counselorCtx = updatedContext;

            console.log("LLM reply:", reply);

            // Send the reply text to frontend (for logging / debug)
            ws.send(
              JSON.stringify({
                type: "llm_reply",
                text: reply,
              })
            );

            // 3) TTS: Turn reply text into audio (MP3 Buffer)
            try {
              const audioBuffer = await synthesizeSpeech(reply);

              // Send audio as BINARY message
              ws.send(audioBuffer);
            } catch (ttsErr: any) {
              console.error("TTS error:", ttsErr);
              ws.send(
                JSON.stringify({
                  type: "tts_error",
                  error: ttsErr?.message ?? String(ttsErr),
                })
              );
            }
          } catch (err: any) {
            console.error("LLM error:", err);
            ws.send(
              JSON.stringify({
                type: "llm_error",
                error: err?.message ?? String(err),
              })
            );
          }
        }
      },

      onError: (err) => {
        console.error("STT error:", err);
        ws.send(
          JSON.stringify({
            type: "stt_error",
            error: err.message,
          })
        );
      },
      onClose: () => {
        console.log("STT session closed");
      },
    });
  } catch (err) {
    console.error("Failed to create STT session:", err);
    ws.close();
    return;
  }

  ws.on("message", (data: RawData) => {
    const typeDesc = Buffer.isBuffer(data)
      ? "Buffer"
      : data instanceof ArrayBuffer
        ? "ArrayBuffer"
        : Array.isArray(data)
          ? "Buffer[]"
          : typeof data;

    // console.log("Received message type:", typeDesc);

    if (typeof data === "string") {
      console.log("Received TEXT from client:", data);
      // optional echo for debugging
      // ws.send(`Server echo: ${data}`);
    } else if (Buffer.isBuffer(data)) {
      // Binary PCM audio chunk
      // console.log("Received BINARY audio chunk, length:", data.length);
      if (sttSession) {
        sttSession.sendAudio(data);
      }
    } else if (data instanceof ArrayBuffer) {
      const buf = Buffer.from(data);
      if (sttSession) {
        sttSession.sendAudio(buf);
      }
    } else if (Array.isArray(data)) {
      const totalLen = data.reduce((sum, b) => sum + b.length, 0);
      console.log("Received Buffer[] chunks, total length:", totalLen);
      if (sttSession) {
        for (const b of data) {
          sttSession.sendAudio(b);
        }
      }
    } else {
      console.log("Received unknown data type");
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
    if (sttSession) {
      sttSession.close();
      sttSession = null;
    }
  });
});

console.log(`WebSocket server listening on ws://localhost:${PORT}`);



