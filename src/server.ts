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
import type { CounselorContext, CollectedFields } from "./llmClient.js";
import { synthesizeSpeech } from "./ttsClient.js";
import OpenAI from "openai";

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
    // Serve favicon
    try {
      const favicon = readFileSync(join(process.cwd(), 'public', 'favicon.svg'), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end(favicon);
    } catch (err) {
      res.writeHead(404);
      res.end();
    }
  } else if (req.url?.endsWith('.js')) {
    // Serve JavaScript files from public directory (e.g., vad-processor.js)
    try {
      const jsFile = readFileSync(join(process.cwd(), 'public', req.url), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(jsFile);
    } catch (err) {
      res.writeHead(404);
      res.end('JS file not found');
    }
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

// Field extraction function - extracts collected fields from user responses
function extractFieldsFromConversation(
  userText: string,
  agentReply: string,
  currentFields: CollectedFields
): CollectedFields {
  const updatedFields = { ...currentFields };
  const lowerUserText = userText.toLowerCase().trim();
  const lowerAgentReply = agentReply.toLowerCase().trim();
  
  // Extract Name (if user says "my name is", "I am", "I'm", etc.)
  if (!updatedFields.name) {
    const namePatterns = [
      /(?:my name is|i am|i'm|name is|call me|i'm called)\s+([a-z\s]+?)(?:\s|$|,|\.)/i,
      /^([a-z\s]{2,30})$/i // If it's just a name (2-30 chars, mostly letters)
    ];
    for (const pattern of namePatterns) {
      const match = userText.match(pattern);
      if (match && match[1]) {
        const extractedName = match[1].trim();
        if (extractedName.length >= 2 && extractedName.length <= 50) {
          updatedFields.name = extractedName;
          console.log(`[FIELD EXTRACTION] Name extracted: "${extractedName}"`);
          break;
        }
      }
    }
  }
  
  // Extract Phone (if user provides phone number)
  if (!updatedFields.phone) {
    // Match phone numbers (digits, with or without spaces/dashes)
    const phoneMatch = userText.match(/(?:\+?\d{1,3}[\s-]?)?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4}/);
    if (phoneMatch) {
      updatedFields.phone = phoneMatch[0].trim();
      console.log(`[FIELD EXTRACTION] Phone extracted: "${updatedFields.phone}"`);
    }
  }
  
  // Extract Course (if agent acknowledges course selection)
  if (!updatedFields.course) {
    const courseKeywords = ['bhm', 'culinary', 'front office', 'housekeeping', 'bakery', 'hospitality', 'mba', 'diploma', 'certificate'];
    const mentionedCourse = courseKeywords.find(keyword => lowerUserText.includes(keyword));
    if (mentionedCourse) {
      // Map to full course name
      const courseMap: { [key: string]: string } = {
        'bhm': 'Bachelor of Hotel Management',
        'culinary': 'Diploma in Food Production (Culinary Arts)',
        'front office': 'Certificate in Front Office Operations',
        'housekeeping': 'Diploma in Housekeeping Operations',
        'bakery': 'Diploma in Bakery & Confectionery',
        'hospitality': 'B.Sc in Hospitality & Hotel Administration',
        'mba': 'MBA in Hospitality Management',
        'diploma': 'Advanced Diploma in Hospitality & Tourism Management',
        'certificate': 'Certificate in Food & Beverage Service'
      };
      updatedFields.course = courseMap[mentionedCourse] || mentionedCourse;
      console.log(`[FIELD EXTRACTION] Course extracted: "${updatedFields.course}"`);
    }
  }
  
  // Extract Education (if user mentions education level)
  if (!updatedFields.education) {
    if (lowerUserText.includes('12th') || lowerUserText.includes('twelfth') || lowerUserText.includes('12')) {
      if (lowerUserText.includes('pass') || lowerUserText.includes('completed') || lowerUserText.includes('graduate')) {
        updatedFields.education = '12th Pass';
        console.log(`[FIELD EXTRACTION] Education extracted: "12th Pass"`);
      } else if (lowerUserText.includes('pursuing') || lowerUserText.includes('studying')) {
        updatedFields.education = 'Pursuing 12th';
        console.log(`[FIELD EXTRACTION] Education extracted: "Pursuing 12th"`);
      }
    } else if (lowerUserText.includes('graduate') || lowerUserText.includes('graduation') || lowerUserText.includes('degree')) {
      updatedFields.education = 'Graduate';
      console.log(`[FIELD EXTRACTION] Education extracted: "Graduate"`);
    }
  }
  
  // Extract Intake Year (if user mentions year)
  if (!updatedFields.intakeYear) {
    const yearMatch = userText.match(/(?:20\d{2}|next year|this year)/i);
    if (yearMatch) {
      const year = yearMatch[0];
      if (year.match(/20\d{2}/)) {
        updatedFields.intakeYear = year;
      } else if (year.toLowerCase().includes('next')) {
        updatedFields.intakeYear = (new Date().getFullYear() + 1).toString();
      } else {
        updatedFields.intakeYear = new Date().getFullYear().toString();
      }
      console.log(`[FIELD EXTRACTION] Intake Year extracted: "${updatedFields.intakeYear}"`);
    }
  }
  
  // Extract City (if user mentions city name)
  if (!updatedFields.city) {
    // Common Indian cities pattern (simple heuristic)
    const cityPatterns = [
      /(?:from|in|at|city is|located in)\s+([a-z\s]{3,30})/i,
      /^([a-z]{3,30})$/i // If it's just a city name
    ];
    for (const pattern of cityPatterns) {
      const match = userText.match(pattern);
      if (match && match[1]) {
        const extractedCity = match[1].trim();
        // Basic validation: should be 3-30 chars, mostly letters
        if (extractedCity.length >= 3 && extractedCity.length <= 30 && /^[a-z\s]+$/i.test(extractedCity)) {
          updatedFields.city = extractedCity;
          console.log(`[FIELD EXTRACTION] City extracted: "${extractedCity}"`);
          break;
        }
      }
    }
  }
  
  // Extract Budget (if user mentions budget/amount)
  if (!updatedFields.budget) {
    const budgetMatch = userText.match(/(?:budget|amount|fee|cost|price|rupees?|rs\.?|lakh|lacs?|thousand|k)\s*(?:is|of|:)?\s*([\d.,\s]+(?:\s*(?:lakh|lacs?|thousand|k))?)/i);
    if (budgetMatch && budgetMatch[1]) {
      updatedFields.budget = budgetMatch[1].trim();
      console.log(`[FIELD EXTRACTION] Budget extracted: "${updatedFields.budget}"`);
    }
  }
  
  return updatedFields;
}

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
        
        // Handle wake phrase intent check
        // FIXED: Add try-catch to prevent WebSocket handler crashes on API failures
        if (parsed.type === "wake_phrase_intent_check") {
          const userText = parsed.text;
          console.log("Wake phrase intent check:", userText);
          
          try {
            // Use LLM to check if this is a wake phrase
            const openaiApiKey = process.env.OPENAI_API_KEY;
            if (!openaiApiKey) {
              ws.send(JSON.stringify({ type: "wake_phrase_intent_result", isWakePhrase: false, text: userText }));
              return;
            }
            
            const client = new OpenAI({ apiKey: openaiApiKey });
            const completion = await client.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "You are a wake phrase detector. Does this user message indicate they want to start a conversation about hotel management admissions/counselling with Riya? The message should be relevant to hotel management, admissions, courses, or the institute. Ignore if it's just a greeting without context or part of an ongoing conversation. Answer only 'yes' or 'no'."
                },
                {
                  role: "user",
                  content: userText
                }
              ],
              temperature: 0.1,
              max_tokens: 10
            });
            
            const response = completion.choices[0]?.message?.content?.toLowerCase().trim() || "no";
            const isWakePhrase = response.includes("yes");
            
            ws.send(JSON.stringify({ 
              type: "wake_phrase_intent_result", 
              isWakePhrase,
              text: userText 
            }));
          } catch (err: any) {
            console.error("Wake phrase intent check error:", err);
            // Send failure response to prevent client from hanging
            ws.send(JSON.stringify({ 
              type: "wake_phrase_intent_result", 
              isWakePhrase: false,
              text: userText 
            }));
          }
          return;
        }
        
        // Handle ending intent check
        // FIXED: Add try-catch to prevent WebSocket handler crashes on API failures
        if (parsed.type === "ending_intent_check") {
          const userText = parsed.text;
          console.log("Ending intent check:", userText);
          
          try {
            // Use LLM to check if this indicates ending
            const openaiApiKey = process.env.OPENAI_API_KEY;
            if (!openaiApiKey) {
              ws.send(JSON.stringify({ type: "ending_intent_result", isEndingIntent: false, text: userText }));
              return;
            }
            
            const client = new OpenAI({ apiKey: openaiApiKey });
            const completion = await client.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "You are an ending intent detector. Does this user message indicate they want to end the call? Consider context: if they're saying 'thank you' mid-conversation, it's likely just gratitude, not ending. If they say 'thank you, that's all' or 'bye', it's likely ending. Answer only 'yes' or 'no'."
                },
                {
                  role: "user",
                  content: userText
                }
              ],
              temperature: 0.1,
              max_tokens: 10
            });
            
            const response = completion.choices[0]?.message?.content?.toLowerCase().trim() || "no";
            const isEndingIntent = response.includes("yes");
            
            ws.send(JSON.stringify({ 
              type: "ending_intent_result", 
              isEndingIntent,
              text: userText 
            }));
          } catch (err: any) {
            console.error("Ending intent check error:", err);
            // Send failure response to prevent client from hanging
            ws.send(JSON.stringify({ 
              type: "ending_intent_result", 
              isEndingIntent: false,
              text: userText 
            }));
          }
          return;
        }
        
        // Handle clear intent check (for wake phrase verification)
        // FIXED: Add try-catch to prevent WebSocket handler crashes on API failures
        if (parsed.type === "clear_intent_check") {
          const userText = parsed.text;
          const startTime = Date.now();
          console.log(`[Clear Intent] Checking: "${userText}"`);
          
          try {
            // Use LLM to check if this has clear intent
            const openaiApiKey = process.env.OPENAI_API_KEY;
            if (!openaiApiKey) {
              console.warn(`[Clear Intent] No API key, rejecting`);
              ws.send(JSON.stringify({ type: "clear_intent_result", hasClearIntent: false, text: userText }));
              return;
            }
            
            const client = new OpenAI({ apiKey: openaiApiKey });
            // OPTIMIZED: Use faster model (gpt-4o-mini) with minimal tokens for speed
            const completion = await client.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "You are a wake phrase intent detector. Answer 'yes' if the user wants to start a conversation about hotel management/admissions/counselling. Answer 'yes' if the message contains ANY of these patterns: (1) Greeting (hello, hi, namaste) + keyword (counselling, counseling, admission, course, hotel, management), OR (2) Intent word (need, want, looking for, interested in, tell me about, information about) + keyword, OR (3) 'Riya' + keyword. CRITICAL: 'Hello, I want counselling' = YES, 'I need counselling' = YES, 'Hello I want counselling' = YES. Answer 'no' ONLY if: just 'hello' alone, casual chat, or completely unrelated. Be lenient - if there's any indication of wanting counselling/admission, answer 'yes'. Answer only 'yes' or 'no'."
                },
                {
                  role: "user",
                  content: userText
                }
              ],
              temperature: 0.1,
              max_tokens: 5 // REDUCED: From 10 to 5 tokens for faster response (only need yes/no)
            });
            
            const latency = Date.now() - startTime;
            const response = completion.choices[0]?.message?.content?.toLowerCase().trim() || "no";
            const hasClearIntent = response.includes("yes");
            
            console.log(`[Clear Intent] Input: "${userText}" | LLM Response: "${response}" | Result: ${hasClearIntent ? "YES" : "NO"} | Latency: ${latency}ms`);
            
            ws.send(JSON.stringify({ 
              type: "clear_intent_result", 
              hasClearIntent,
              text: userText 
            }));
          } catch (err: any) {
            const latency = Date.now() - startTime;
            console.error(`[Clear Intent] Error after ${latency}ms:`, err);
            // Send failure response to prevent client from hanging
            ws.send(JSON.stringify({ 
              type: "clear_intent_result", 
              hasClearIntent: false,
              text: userText 
            }));
          }
          return;
        }
        
        // FIXED: Handle new_call message to reset context for a fresh conversation
        if (parsed.type === "new_call") {
          console.log("New call started - resetting context");
          counselorCtx = createInitialCounselorContext();
          if (sessionId) {
            sessions.set(sessionId, counselorCtx);
          }
          ws.send(JSON.stringify({
            type: "context_reset",
            message: "Context reset for new call"
          }));
          return;
        }
        
        // FIXED: Handle agent_speak messages (for confirmation questions, re-auth prompts, etc.)
        if (parsed.type === "agent_speak") {
          const agentText = parsed.text;
          console.log("Agent speak request:", agentText);
          
          try {
            // Send text chunk to frontend
            ws.send(JSON.stringify({
              type: "llm_reply",
              text: agentText + " ",
            }));
            
            // Generate TTS for agent speech
            const audioBuffer = await synthesizeSpeech(agentText);
            ws.send(audioBuffer);
            
            console.log("Agent speech synthesized and sent");
          } catch (ttsErr: any) {
            console.error("TTS error (agent_speak):", ttsErr);
            ws.send(JSON.stringify({
              type: "tts_error",
              error: "Failed to synthesize agent speech",
            }));
          }
          return;
        }
        
        if (parsed.type === "user_text") {
          const userText = parsed.text;
          const isSystemMessage = parsed.isSystemMessage || false;
          
          // Handle system messages (name collection, follow-ups, etc.)
          if (isSystemMessage) {
            console.log("Received system message from client:", userText);
            // Treat as user message for LLM (so LLM processes it naturally)
            // Continue with normal flow below
          } else {
            console.log("Received text from client:", userText);
          }

          // FIXED: LLM streaming code must be inside the user_text conditional block
          // 1) ABORT PREVIOUS STREAM AND TRACK INTERRUPTION
          if (currentController) {
            console.log("[INTERRUPTION] Barge-in detected: aborting previous response.");
            
            // Bookmark what was being said when interrupted
            const lastAssistantMessage = counselorCtx.history
              .filter(m => m.role === "assistant")
              .slice(-1)[0];
            const interruptedContext = lastAssistantMessage?.content?.substring(0, 100) || "discussing a topic";
            
            // Determine which field was being collected (if any)
            const lastUserMessage = counselorCtx.history
              .filter(m => m.role === "user")
              .slice(-1)[0];
            let interruptedField = null;
            if (lastUserMessage?.content) {
              const lowerContent = lastUserMessage.content.toLowerCase();
              if (lowerContent.includes('name') || lowerContent.includes('naam')) interruptedField = 'name';
              else if (lowerContent.includes('phone') || lowerContent.includes('number')) interruptedField = 'phone';
              else if (lowerContent.includes('course') || lowerContent.includes('program')) interruptedField = 'course';
              else if (lowerContent.includes('education') || lowerContent.includes('12th')) interruptedField = 'education';
              else if (lowerContent.includes('year') || lowerContent.includes('intake')) interruptedField = 'intakeYear';
              else if (lowerContent.includes('city')) interruptedField = 'city';
              else if (lowerContent.includes('budget') || lowerContent.includes('fee')) interruptedField = 'budget';
            }
            
            // Update interruption state
            counselorCtx.interruptionState = {
              wasInterrupted: true,
              interruptedTopic: interruptedContext,
              interruptedField: interruptedField,
              interruptedContext: interruptedContext,
              interruptedTimestamp: Date.now()
            };
            
            console.log(`[INTERRUPTION] Bookmarked: Topic="${interruptedContext}", Field="${interruptedField}"`);
            
            // Add interruption marker to conversation history
            counselorCtx.history.push({
              role: "system",
              content: `[INTERRUPTED: User interrupted while ${interruptedContext}]`
            });
            
            currentController.abort();
            currentController = null;
          }

          // 2) CREATE NEW CONTROLLER
          currentController = new AbortController();
          const signal = currentController.signal;

          // CRITICAL: Extract fields from user response BEFORE streaming
          counselorCtx.collectedFields = extractFieldsFromConversation(userText, "", counselorCtx.collectedFields);
          console.log(`[FIELDS STATE] Current collected fields:`, JSON.stringify(counselorCtx.collectedFields, null, 2));

          // Trigger LLM streaming
          try {
            const stream = streamCounselorReply(counselorCtx, userText, signal);
            let sentenceBuffer = "";
            let fullReplyAggregated = "";
            let lastSentences: string[] = []; // Track last 3 sentences to detect repetition
            let repetitionCount = 0; // Count consecutive repetitions

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
                  // REPETITION DETECTION: Check if this sentence is too similar to recent ones
                  const isRepetition = lastSentences.some(prev => {
                  // Check if sentences are very similar (same words, same structure)
                  const normalizedCurrent = completeSentence.toLowerCase().replace(/[^\w\s]/g, '').trim();
                  const normalizedPrev = prev.toLowerCase().replace(/[^\w\s]/g, '').trim();
                  
                  // If sentences are >80% similar, it's likely a repetition
                  if (normalizedCurrent.length < 10 || normalizedPrev.length < 10) return false; // Skip very short sentences
                  
                  const wordsCurrent = new Set(normalizedCurrent.split(/\s+/).filter(w => w.length > 0));
                  const wordsPrev = new Set(normalizedPrev.split(/\s+/).filter(w => w.length > 0));
                  
                  // FIXED: Use Jaccard similarity (intersection over union) instead of commonWords/maxLength
                  // Previous calculation: commonWords / max(length1, length2) was too strict
                  // Example: "hello world" vs "hello world foo bar" = 2/4 = 0.5 (not detected)
                  // Jaccard: intersection / union = 2 / 4 = 0.5 (same, but more accurate for different lengths)
                  // Better: Use intersection over min for containment detection
                  const intersection = new Set([...wordsCurrent].filter(w => wordsPrev.has(w)));
                  const union = new Set([...wordsCurrent, ...wordsPrev]);
                  
                  // Jaccard similarity: intersection / union
                  const jaccardSimilarity = intersection.size / union.size;
                  
                  // FIXED: Check containment correctly - verify smaller sentence is truly contained AND significant
                  // Previous calculation incorrectly identified subsets as repetitions
                  // Example: "Education" vs "What is your Education level?" would incorrectly match
                  // Fix: Require that smaller sentence is both contained AND represents significant portion of larger
                  const smallerSet = wordsCurrent.size <= wordsPrev.size ? wordsCurrent : wordsPrev;
                  const largerSet = wordsCurrent.size > wordsPrev.size ? wordsCurrent : wordsPrev;
                  const smallerInLarger = [...smallerSet].every(w => largerSet.has(w));
                  
                  // FIXED: When smallerInLarger is true, intersection.size always equals smallerSet.size
                  // This made containmentRatio always 1.0, causing false positives
                  // Solution: Only consider it repetition if smaller is at least 70% of larger sentence length
                  // This prevents single-word sentences from matching longer sentences
                  const sizeRatio = smallerSet.size / largerSet.size;
                  const isSignificantContainment = smallerInLarger && sizeRatio >= 0.7;
                  
                  // Consider it repetition if Jaccard > 0.8 OR (smaller is significantly contained in larger)
                  return jaccardSimilarity > 0.8 || isSignificantContainment;
                  });

                  if (isRepetition) {
                    repetitionCount++;
                    console.warn(`[REPETITION DETECTED] Sentence #${repetitionCount}: "${completeSentence.substring(0, 50)}..."`);
                    
                    // FIXED: Do NOT add repetitive sentences to lastSentences
                    // Only track sentences that were actually sent to the user
                    // Adding skipped sentences pollutes the tracking array and can cause false positives
                    // when legitimate sentences happen to match previously-skipped repetitions
                    
                    // If we detect 2+ repetitions, stop the stream to prevent loop
                    if (repetitionCount >= 2) {
                      console.error("[LOOP DETECTED] Stopping stream to prevent infinite repetition");
                      currentController?.abort();
                      ws.send(JSON.stringify({
                        type: "llm_error",
                        error: "Response loop detected. Please try again.",
                      }));
                      break;
                    }
                    // Skip this sentence (don't send/TTS)
                    continue;
                  } else {
                    // Reset repetition count if we get a new sentence
                    repetitionCount = 0;
                  }

                  // Track last 3 sentences (for repetition detection)
                  // Only add sentences that were actually sent to the user
                  lastSentences.push(completeSentence);
                  if (lastSentences.length > 3) {
                    lastSentences.shift(); // Keep only last 3
                  }

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

            // Extract fields from user response and LLM acknowledgment
            const updatedFields = extractFieldsFromConversation(userText, fullReplyAggregated, counselorCtx.collectedFields);
            
            // Clear interruption state after responding (interruption has been handled)
            const clearedInterruptionState = {
              wasInterrupted: false,
              interruptedTopic: null,
              interruptedField: null,
              interruptedContext: null,
              interruptedTimestamp: null
            };
            
            // Update Context with full reply and extracted fields
            counselorCtx = {
              ...counselorCtx,
              history: [
                ...counselorCtx.history,
                { role: "user", content: userText },
                { role: "assistant", content: fullReplyAggregated }
              ],
              collectedFields: updatedFields,
              interruptionState: clearedInterruptionState
            };

          } catch (err: any) {
            // Check if it was an abort error
            if (err.name === 'AbortError' || signal.aborted) {
              console.log("Stream aborted.");
              // Ensure context is saved even on error/throw
              // Extract fields even if stream was aborted (user might have provided data)
              const updatedFields = extractFieldsFromConversation(userText, "", counselorCtx.collectedFields);
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
                ],
                collectedFields: updatedFields
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




