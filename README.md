# Admissions Voice Agent

A WebSocket-based voice agent for admissions counseling, built with Node.js.

## Features
- **Speech-to-Text (STT)**: Uses Deepgram to transcribe user audio.
- **LLM**: Uses OpenAI/Sarvam AI to generate responses.
- **Text-to-Speech (TTS)**: Uses Sarvam AI (formerly ElevenLabs) to synthesize audio responses.
- **Real-time**: Handles audio streaming via WebSockets.

## Prerequisites
- Node.js (v20 or later)
- API Keys:
    - OpenAI
    - Deepgram
    - Sarvam AI

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file with the following:
   ```env
   OPENAI_API_KEY=your_key_here
   DEEPGRAM_API_KEY=your_key_here
   SARVAM_API_KEY=your_key_here
   PORT=8080
   ```

3. **Run Locally:**
   ```bash
   npm run dev
   ```

## Deployment (Render)

This project is configured for deployment on [Render](https://render.com).

1. Connect your repository to Render.
2. Select **Web Service**.
3. Render will verify the `render.yaml` configuration.
4. Add your Environment Variables in the Render dashboard.
