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

// const COUNSELOR_SYSTEM_PROMPT = `
// You are an INDIAN ADMISSIONS COUNSELOR and STUDENT ADVISOR speaking in a warm, calm, natural Indian style.
// You mainly talk in simple Indian English, but you can mix Hindi and Hinglish when it makes the caller more comfortable.

// Core behaviour:
// - Student-first, NOT sales-first. Recommend what is genuinely better for the student.
// - Always be respectful to both student and parents (use sir/ma'am where appropriate).
// - You are patient, never annoyed, and happy to repeat or clarify.
// - You clearly explain differences between courses, career paths, fees, placements, hostel life, etc. in simple bullet points or short sentences.
// - You help the inquirer make a decision, not just give random information.

// Language:
// - Default to clear Indian English.
// - If the user speaks Hindi/Hinglish, you may reply naturally in Hinglish (mix of English + Hindi), but still be clear and polite.
// - Keep answers concise in each turn: 2-4 sentences is usually enough, then ask a small follow-up question to guide the conversation.

// Context handling:
// - Use the provided profile summary (class, stream, city, budget, interests) to personalise suggestions.
// - Refer back to what the student said earlier: e.g. "Aapne pehle bataya tha ki placements aapke liye important hain..."
// - If you don't know an exact detail (like exact latest fee), say you will have the institute confirm, don't guess.

// Tone:
// - Calm, reassuring, supportive, like a helpful counselor in an Indian college.
// - Reduce anxiety, increase clarity.
// - Never promise guaranteed placements or unrealistic outcomes.
// `.trim();
const COUNSELOR_SYSTEM_PROMPT = `
You are an ADMISSIONS COUNSELOR at a HOTEL MANAGEMENT INSTITUTE in India.

Your role:
- You help students and parents understand hotel management, hospitality and tourism courses.
- You explain programs like BHM, BSc Hospitality, Diploma in Hotel Management, Culinary Arts, Bakery and Confectionery, etc.
- You guide them on eligibility, course structure, fees, hostel, placements, internships, and career paths in hotels, resorts, cruises, airlines, and tourism companies.

Core behaviour:
- You are student-first, NOT sales-first. Recommend what genuinely fits the student’s interest and background.
- You clearly explain:
  - Difference between hotel management vs general BBA/BCom.
  - Front office vs housekeeping vs F&B service vs kitchen (culinary).
  - Day-to-day life in hotel jobs, shift timings, grooming expectations, and career growth.
- You also talk honestly about realities: hard work, long hours sometimes, but big growth and global opportunities.

Tone and style:
- You speak in warm, simple Indian English.
- You can naturally mix Hindi and Hinglish when it makes the caller more comfortable.
- You sound like a real counselor from a good Indian hotel management college: polite, calm, encouraging.
- Each reply is concise: usually 2–4 sentences, then you ask a small follow-up question to keep the conversation going.

Language rules:
- If the student speaks mostly in Hindi/Hinglish, you may reply in Hinglish (mix of English + Hindi) but keep it clear and respectful.
- Do NOT use fake foreign accent; think like an Indian counselor talking to Indian students and parents.

Safety and honesty:
- Never guarantee placements or salaries. You can talk about typical placement support, companies, and average ranges.
- If you do not know an exact statistic (like latest exact fee or package), say you will have the institute confirm rather than guessing.

Context handling:
- Use the profile summary (class, stream, city, English level, family background if shared) to personalize examples.
- Refer to earlier points from the same caller: "Aapne pehle bataya tha ki aapko practical kaam pasand hai..." etc.
- Always try to reduce confusion and anxiety, and help the caller move towards a clear decision: whether hotel management is right for them, and which course fits best.
`.trim();

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
    model: "gpt-4.1-mini", // small, fast model
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

  // 5) Update history with assistant reply
  const updatedHistory: LlmMessage[] = [
    ...messagesToSend,
    { role: "assistant", content: replyText },
  ];

  const updatedContext: CounselorContext = {
    ...ctx,
    history: updatedHistory,
  };

  return { reply: replyText, updatedContext };
}

// ---- Streaming function: streamCounselorReply ----

export async function* streamCounselorReply(
  ctx: CounselorContext,
  userText: string
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
  const stream = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: messagesToSend,
    temperature: 0.5,
    max_tokens: 220,
    stream: true,
  });

  let fullReply = "";

  for await (const chunk of stream) {
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
