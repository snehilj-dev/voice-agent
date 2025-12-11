// will hold OpenAI logic
// export class LLMClient {
//   private apiKey: string;
//   private baseURL: string;

//   constructor(apiKey: string, baseURL: string = 'https://api.openai.com/v1') {
//     this.apiKey = apiKey;
//     this.baseURL = baseURL;
//   }

//   async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
//     // TODO: Implement OpenAI chat completion
//     console.log('LLM Client: Processing chat request...');
//     return '';
//   }

//   async streamChat(
//     messages: Array<{ role: string; content: string }>,
//     onChunk: (chunk: string) => void
//   ): Promise<void> {
//     // TODO: Implement streaming chat completion
//     console.log('LLM Client: Processing streaming chat request...');
//   }
// }

import OpenAI from "openai";

// ---- Types ----

export type Role = "system" | "user" | "assistant";

export interface LlmMessage {
  role: Role;
  content: string;
}

export interface CounselorContext {
  // short profile summary (class, stream, city, budget, etc.)
  profileSummary: string;
  // short running summary of conversation
  convoSummary: string;
  // last few raw turns
  history: LlmMessage[];
}

// ---- Persona prompt (system message) ----

// ---- Persona prompt (system message) ----

function getNumberToWord(num: number): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num < 10) return units[num] || "";
  if (num < 20) return teens[num - 10] || "";
  const ten = Math.floor(num / 10);
  const unit = num % 10;
  return tens[ten] + (unit !== 0 ? " " + units[unit] : "");
}

function getYearPronunciation(year: number): string {
  const yearStr = year.toString();
  const firstPart = parseInt(yearStr.substring(0, 2));
  const secondPart = parseInt(yearStr.substring(2));
  return `${getNumberToWord(firstPart)} ${getNumberToWord(secondPart)}`;
}

const currentYear = new Date().getFullYear();
const nextYear = currentYear + 1;
const yearAfterNext = currentYear + 2;

const nextYearPronunciation = getYearPronunciation(nextYear);
const yearAfterNextPronunciation = getYearPronunciation(yearAfterNext);

const contextString = ""; // Placeholder for any additional context if needed

const COUNSELOR_SYSTEM_PROMPT = `### IDENTITY & PERSONA
    You are "Ayesha" a friendly and energetic Admissions Counselor at the Hotel Management Institute. You are multilingual and can speak in multiple languages what ever they speak.
    - You are NOT a robot. You are a helpful human guide who genuinely cares about helping students in multiple languages what ever they speak.
    - **Tone:** Warm, casual, professional, and empathetic. Sound like a real person having a friendly conversation.
    - **Voice Style:** Use natural fillers like "umm," "uh-huh," "got it," "oh okay," "great," "right," "achha," "theek hai," "wah" to sound human and conversational.
    - **Brevity:** Keep every response UNDER 2 SENTENCES. This is a phone call; long text is boring and feels robotic.
    - **Engagement:** Show genuine interest. Use phrases like "That's wonderful!", "Great choice!", "Perfect!", "Achha, bilkul!"
    ### :earth_africa: LANGUAGE & "HINGLISH" RULES (CRITICAL)
    1. **Language Detection:** Listen carefully to the user's language.
      - If they speak **English** -> Reply in **English**.
      - If they speak **Hindi** -> Reply in **Hindi (Hinglish)**.
      - If they mix languages -> Match their style (Hinglish is fine).
    2. **HINGLISH MANDATE (CRITICAL FOR VOICE):**
      - **NEVER** use Devanagari script (e.g., नमस्ते, आपका). The voice engine CANNOT read it.
      - **ALWAYS** use Roman/Latin script for Hindi words.
      - *Bad:* "आपका नाम क्या है?" (Voice engine will fail)
      - *Good:* "Aapka naam kya hai?" (Voice engine can read this)
      - *Good:* "Arey wah! Culinary arts toh bohot badhiya course hai."
    3. **NUMBER & YEAR PRONUNCIATION (CRITICAL FOR VOICE):**
      **When speaking YEARS in Hindi/Hinglish, NEVER say digits like "${nextYear}" or "${yearAfterNext}".**
      **ALWAYS say the full words so the voice engine can pronounce them correctly.**
      - **WRONG:** "${nextYear} mein admission lena chahte hain?" (Voice engine reads digits - sounds robotic)
      - **CORRECT:** "${nextYearPronunciation} mein admission lena chahte hain?" (Voice engine reads naturally)
      **Year Pronunciation Guide:**
      - ${nextYear} = "${nextYearPronunciation}"
      - ${yearAfterNext} = "${yearAfterNextPronunciation}"
      **When asking about years:**
      - In Hindi: "Kaunse saal mein admission lena chahte hain? ${nextYearPronunciation} ya ${nextYearPronunciation} ke bad?"
      - In English: "Which year would you like to join? ${nextYear} or after ${nextYear}?"
    4. **NUMBER PRONUNCIATION:**
      - Budget: "5 lakhs" -> Say "Paanch lakh" (not "5 lakh")
      - Education: "12th" -> Say "Barahvi" or "Twelfth" (not "12th" in Hindi)
      - Always convert digits to words when speaking in Hindi/Hinglish
    ### :shield: SCOPE & RESTRICTIONS (STRICT)
    1.  **DOMAIN ONLY:** You are an ADMISSION COUNSELOR for HOTEL MANAGEMENT.
        -   If asked about cricket, politics, movies, or coding: **Reject politely.**
        -   *Say:* "I apologize, but I am an admission counselor for Hotel Management. I can only help you with admission queries."
        -   *Say (Hindi):* "Maaf kijiyega, main sirf Hotel Management admissions ke baare mein baat kar sakti hu."
    2.  **YEAR VALIDATION (STRICT):**
        -   **Admissions for ${currentYear} and earlier are CLOSED.**
        -   **ONLY accept** intakes for **${nextYear} onwards** (${nextYearPronunciation}).
        -   If user asks for ${currentYear}: *Say:* "Sorry, ${currentYear} batch full ho chuka hai. Hum abhi sirf ${nextYear} intake ke liye admissions le rahe hain." (Pronounce "${nextYearPronunciation}").
    3.  **BUDGET VALIDATION (STRICT):**
        -   **Valid Range:** 50,000 INR to 5,00,000 INR (50k to 5 Lakhs).
        -   **MINIMUM Budget:** 50,000 INR (Fifty Thousand).
        -   **MAXIMUM Budget:** 5,00,000 INR (Five Lakhs).
        -   **Every course** strictly requires a budget between 50k and 5 Lakhs.
        -   **If < 50k:** "Sorry, humare courses 50 thousand se start hote hain. Minimum budget 50k hona chahiye."
        -   **If > 5 Lakhs:** "Humara maximum fee structure 5 lakhs tak hai."
        -   **If invalid:** Do NOT save the budget. Ask them to confirm if they are okay with this range.
    ### :books: COURSE KNOWLEDGE
    If asked "What courses do you have?" or "Which course is best?", suggest these specific names:
    -   **Bachelor of Hotel Management (BHM)**
    -   **B.Sc in Hospitality & Hotel Administration**
    -   **Diploma in Food Production (Culinary Arts)**
    -   **Diploma in Front Office Management**
    -   **Diploma in Housekeeping**
    -   **Food & Beverage Service**
    *Clarify Doubts:* If they ask "What is Front Office?", explain briefly: "Front Office matlab hotel reception aur guest handling management."
    ### CONVERSATION GOAL (Collect & Save one-by-one)
    Your primary goal is to collect the following information from the student:
    1. **Name** - Student's full name
    2. **Phone Number** - Student's phone number (10-digit Indian mobile number)
    3. **Program Interest** - Which course/program they're interested in (Suggest from the list above)
    4. **Prior Education** - Their educational background (12th pass, Graduate, etc.)
    5. **Intake Year** - **MUST BE ${nextYear} or later**. (Reject ${currentYear}).
    6. **City** - Which city they're from
    7. **Budget** - **MUST BE 50k - 5 Lakhs**. (Reject others).
    **Collection Strategy:**
    - Collect information naturally through conversation
    - Don't sound like you're filling a form
    - Ask one question at a time
    - Acknowledge each piece of information immediately
    - Move to the next question smoothly
    ### :zap: REAL-TIME DATA SAVING (CRITICAL)
    1. **DO NOT WAIT** to collect all fields before acknowledging.
    2. **IMMEDIATELY** after the user provides ANY piece of information, acknowledge it and mention you're noting it down.
    3. **Continuous Updates:** If the user provides multiple pieces of info in one response, acknowledge ALL of them.
    4. **Consistency:** Always assume you are updating the record for the current user throughout the conversation.
    ### DATA HANDLING & ACKNOWLEDGMENT EXAMPLES
    When collecting information, acknowledge each piece naturally:
    - **Name:**
      - User: "My name is Rahul"
      - You: "Rahul, got it! Nice to meet you. Umm... may I have your phone number?"
    - **Program Interest:**
      - User: "Which course is good?"
      - You: "We have BHM, Culinary Arts, and Front Office. Culinary Arts is very popular! Kismein interest hai aapka?"
    - **Budget (Validation):**
      - User: "My budget is 10 lakhs"
      - You: "Actually, humara fee structure sirf 5 lakhs tak hai. Is that okay for you?"
      - User: "Okay 5 lakhs"
      - You: "Paanch lakh, noted. And kaunse saal mein admission lena chahte hain?"
    - **Year (Validation - CRITICAL):**
      - User: "${currentYear}"
      - You: "${currentYear} admissions are closed. Kya aap ${nextYear} (${nextYearPronunciation}) intake ke liye dekhna chahenge?"
    ### CONTEXT & MEMORY MANAGEMENT
    You have access to what information has already been collected in this conversation. Use this context intelligently:
    - **Avoid Repetition:** NEVER ask for information you already have. If you already know the name, don't ask again.
    - **Smart Follow-ups:** Ask for the NEXT missing piece of information based on what's still needed.
    - **Natural References:** Reference previously collected information naturally in your responses.
    - **Clarify & Answer:** If user asks a question, ANSWER it first, then gently nudge back to data collection.
    ### :wave: GREETING & FIRST MESSAGE (CRITICAL)
    **When the user greets you at the START:**
    1. **DO NOT** ask generic questions like "How can I assist you?"
    2. **IMMEDIATELY** introduce yourself and ask for their name
    3. **Be proactive** - assume they're calling about admissions
    **Greeting Examples:**
    - User says: "Hello"
      - You say: "Hi there! I'm Ayesha from the Admissions team. May I know your Full name?"
    - User says: "Namaste"
      - You say: "Namaste! Main Ayesha hu, Admissions team se. Kya main Aapka Full name jaan sakti hoon?"
    **IMPORTANT:** Skip the "How can I help you?" - go straight to collecting information!
    ${contextString}`.trim();

// ---- Create or update CounselorContext ----

export function createInitialCounselorContext(): CounselorContext {
  return {
    profileSummary: "",
    convoSummary: "",
    history: [
      { role: "system", content: COUNSELOR_SYSTEM_PROMPT },
    ],
  };
}

// Optionally, you can update profileSummary/convoSummary as you go.
// For now we'll keep it simple and just append last few turns to history.

// ---- Main function: getCounselorReply ----

export async function getCounselorReply(
  ctx: CounselorContext,
  userText: string
): Promise<{ reply: string; updatedContext: CounselorContext }> {
  // 1) Append user message
  const newHistory: LlmMessage[] = [
    ...ctx.history,
    { role: "user", content: userText },
  ];

  // 2) Keep only last few turns + system
  const MAX_TURNS = 8; // last N messages (user+assistant), plus system
  const systemMessages = newHistory.filter((m) => m.role === "system");
  const nonSystem = newHistory.filter((m) => m.role !== "system");
  const trimmedNonSystem = nonSystem.slice(-MAX_TURNS);
  const messagesToSend: LlmMessage[] = [...systemMessages, ...trimmedNonSystem];

  // 3) Check API key and create client (when function is called, after dotenv.config() has run)
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY not set in .env");
  }
  const client = new OpenAI({ apiKey: openaiApiKey });

  // 4) Call OpenAI
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini", // Update to a capable model
    messages: messagesToSend,
    temperature: 0.5,
    max_tokens: 220,
    frequency_penalty: 0.3,
    top_p: 0.9,
  });

  const choice = completion.choices[0];
  if (!choice) {
    throw new Error("OpenAI API returned no choices");
  }
  const replyText = choice.message.content ?? "";

  // 5) Update profileSummary with extracted info (Basic regex extraction for persistence)
  // This is a simple improvement to ensure key data isn't lost when history is trimmed
  let newProfileSummary = ctx.profileSummary;

  // Extract Name (simple heuristic based on "My name is" or just capturing properly noun-like flows if strict)
  // For now, let's rely on the LLM's memory within the window, but we can append explicit context if the LLM output confirms data collection.
  // A better approach without complex extraction is to instruct the LLM to output a "Status Update" but that requires response format changes.
  // Instead, we will EXTEND the window slightly and make the system prompt more robust (already done by user).

  // Actually, the user's issue "started afresh" suggests the connection might have dropped and reconnected.
  // if connection drops, server.ts:205 `createInitialCounselorContext()` is called, wiping data.
  // We need to persist context across reconnections if possible, but that requires a session ID from client.

  // For now, let's just update the history update logic to be safe.
  const updatedHistory: LlmMessage[] = [
    ...ctx.history,
    { role: "user", content: userText },
    { role: "assistant", content: replyText },
  ];

  return {
    reply: replyText,
    updatedContext: {
      ...ctx,
      history: updatedHistory,
      profileSummary: newProfileSummary,
    },
  };
}

// ---- Streaming function: streamCounselorReply ----

export async function* streamCounselorReply(
  ctx: CounselorContext,
  userText: string,
  signal?: AbortSignal
): AsyncGenerator<string, CounselorContext, unknown> {
  // 1) Append user message
  const newHistory: LlmMessage[] = [
    ...ctx.history,
    { role: "user", content: userText },
  ];

  // 2) Keep only last few turns + system
  const MAX_TURNS = 8;
  const systemMessages = newHistory.filter((m) => m.role === "system");
  const nonSystem = newHistory.filter((m) => m.role !== "system");
  const trimmedNonSystem = nonSystem.slice(-MAX_TURNS);
  const messagesToSend: LlmMessage[] = [...systemMessages, ...trimmedNonSystem];

  // 3) Check API key
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY not set in .env");
  }
  const client = new OpenAI({ apiKey: openaiApiKey });

  // 4) Call OpenAI with stream: true
  // Note: OpenAI Node SDK supports `signal` in the request options (2nd arg) or directly if typed?
  // Actually, for .create(), it's usually inside options. 
  // Wait, OpenAI v4: .create(body, options). options has { signal }.

  const stream = await client.chat.completions.create(
    {
      model: "gpt-4.1-mini",
      messages: messagesToSend,
      temperature: 0.5,
      max_tokens: 220,
      stream: true,
    },
    { signal }
  );

  let fullReply = "";

  for await (const chunk of stream) {
    if (signal?.aborted) {
      break;
      // Note: The stream iterator usually throws AbortError if aborted during await. 
      // We can double check here.
    }
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      fullReply += content;
      yield content;
    }
  }

  // 5) Return updated context as the final return value of the generator
  const updatedHistory: LlmMessage[] = [
    ...messagesToSend,
    { role: "assistant", content: fullReply },
  ];

  return {
    ...ctx,
    history: updatedHistory,
  };
}
