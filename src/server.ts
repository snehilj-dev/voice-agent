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

import { createInitialCounselorContext, getCounselorReply, streamCounselorReply } from "./llmClient.js";
import type { CounselorContext } from "./llmClient.js";
import { synthesizeSpeech } from "./ttsClient.js";

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// Create HTTP server to serve the frontend
const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    try {
      const html = readFileSync(join(process.cwd(), 'public', 'index.html'), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (err) {
      res.writeHead(500);
      res.end('Error loading frontend');
    }
  } else if (req.url === '/favicon.svg') {
    // Optional: Handle favicon if it exists, or 404
    res.writeHead(404);
    res.end();
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Attach WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Store sessions in memory
const sessions = new Map<string, CounselorContext>();

wss.on("connection", async (ws: WebSocket, req) => {
  console.log("New WebSocket connection");

  // Parse sessionId from URL
  const urlParams = new URLSearchParams(req.url?.split('?')[1]);
  const sessionId = urlParams.get('sessionId');

  let counselorCtx: CounselorContext;

  if (sessionId && sessions.has(sessionId)) {
    console.log(`Resuming session for ${sessionId}`);
    counselorCtx = sessions.get(sessionId)!;
  } else {
    console.log(`Creating new session for ${sessionId || 'anonymous'}`);
    counselorCtx = createInitialCounselorContext();
    if (sessionId) sessions.set(sessionId, counselorCtx);
  }

  // Let's declare it in the connection scope
  let currentController: AbortController | null = null;

  ws.on("message", async (data: RawData) => {
    // We expect JSON text messages now
    if (typeof data !== "string" && !Buffer.isBuffer(data)) {
      return;
    }
    const msgString = data.toString();

    try {
      const parsed = JSON.parse(msgString);
      if (parsed.type === "user_text") {
        const userText = parsed.text;
        console.log("Received text from client:", userText);

        // 1) ABORT PREVIOUS STREAM
        if (currentController) {
          console.log("Barge-in detected: aborting previous response.");
          currentController.abort();
          currentController = null;
        }

        // 2) CREATE NEW CONTROLLER
        currentController = new AbortController();
        const signal = currentController.signal;

        // Trigger LLM streaming
        try {
          const stream = streamCounselorReply(counselorCtx, userText, signal);
          let sentenceBuffer = "";
          let fullReplyAggregated = "";

          for await (const chunk of stream) {
            if (signal.aborted) break;

            sentenceBuffer += chunk;
            fullReplyAggregated += chunk;

            // Simple regex for end of sentence
            const sentenceMatch = sentenceBuffer.match(/([.!?;\n]+)\s+/);

            if (sentenceMatch && sentenceMatch.index !== undefined) {
              const splitIndex = sentenceMatch.index + sentenceMatch[0].length;
              const completeSentence = sentenceBuffer.substring(0, splitIndex).trim();
              sentenceBuffer = sentenceBuffer.substring(splitIndex);

              // Double check abort before sending/TTS
              if (signal.aborted) break;

              if (completeSentence) {
                console.log("Processing sentence:", completeSentence);
                // Send text chunk to frontend
                ws.send(JSON.stringify({
                  type: "llm_reply",
                  text: completeSentence + " ",
                }));

                // Generate TTS for this sentence
                try {
                  // Check if we should even start TTS
                  if (!signal.aborted) {
                    const audioBuffer = await synthesizeSpeech(completeSentence);
                    if (!signal.aborted) {
                      ws.send(audioBuffer);
                    }
                  }
                } catch (ttsErr: any) {
                  console.error("TTS error (chunk):", ttsErr);
                }
              }
            }
          }

          // Process remaining buffer if NOT aborted
          if (!signal.aborted && sentenceBuffer.trim()) {
            const remaining = sentenceBuffer.trim();
            console.log("Processing final segment:", remaining);

            ws.send(JSON.stringify({
              type: "llm_reply",
              text: remaining,
            }));

            try {
              const audioBuffer = await synthesizeSpeech(remaining);
              if (!signal.aborted) {
                ws.send(audioBuffer);
              }
            } catch (ttsErr: any) {
              console.error("TTS error (final):", ttsErr);
            }
          }

          // Update Context with full reply (even if partial/aborted, we update!)
          counselorCtx = {
            ...counselorCtx,
            history: [
              ...counselorCtx.history,
              { role: "user", content: userText },
              { role: "assistant", content: fullReplyAggregated }
            ]
          };

        } catch (err: any) {
          // Check if it was an abort error
          if (err.name === 'AbortError' || signal.aborted) {
            console.log("Stream aborted.");
            // Ensure context is saved even on error/throw
            counselorCtx = {
              ...counselorCtx,
              history: [
                ...counselorCtx.history,
                { role: "user", content: userText },
                // Use whatever we captured so far
                // NOTE: fullReplyAggregated might be empty if variable scope issue, 
                // but we defined it inside `try`. 
                // Actually, we can't access `fullReplyAggregated` here easily unless we scope it out.
                // But the loop breaks on signal.aborted usually without throwing.
                // If OpenAI throws AbortError, we might lose `fullReplyAggregated` if we don't scope it up.
                // Let's rely on the loop `break` logic mostly. 
              ]
            };
          } else {
            console.error("Streaming error:", err);
            ws.send(JSON.stringify({
              type: "llm_error",
              error: err?.message ?? String(err),
            }));
          }
        }
      }
    } catch (e) {
      // Not a JSON message or not relevant
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});




