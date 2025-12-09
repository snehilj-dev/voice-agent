// shared types/interfaces

export interface Message {
  type: 'audio' | 'text' | 'transcript' | 'response';
  data: string | Buffer;
  timestamp?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface STTConfig {
  apiKey: string;
  model?: string;
  language?: string;
}

export interface LLMConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TTSConfig {
  apiKey: string;
  region: string;
  endpoint: string;
  voice?: string;
}

