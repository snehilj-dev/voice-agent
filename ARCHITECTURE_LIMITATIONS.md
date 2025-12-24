# Architecture Limitations: Web Speech API vs Custom STT Pipeline

## Why We Cannot "Only Forward Speaker A Segments to ASR" with Web Speech API

### Current Architecture: Web Speech API

#### How Web Speech API Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Chrome)                         │
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │  Microphone  │────────▶│  Web Speech   │                │
│  │    Stream    │         │  API (ASR)   │                │
│  └──────────────┘         └──────┬───────┘                │
│                                   │                         │
│                                   │ (Direct Access)         │
│                                   │                         │
│                                   ▼                         │
│                          ┌─────────────────┐               │
│                          │  ASR Engine     │               │
│                          │  (Inside Browser)│              │
│                          └────────┬─────────┘               │
│                                   │                         │
│                                   │ Transcripts             │
│                                   ▼                         │
│                          ┌─────────────────┐               │
│                          │  Your JavaScript│               │
│                          │     Code        │               │
│                          └─────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

#### Key Limitations

1. **No Audio Stream Control**
   - The Web Speech API directly accesses the microphone stream
   - JavaScript code has **NO access** to the raw audio stream before it reaches ASR
   - The ASR engine processes **everything** the microphone picks up
   - You cannot intercept, modify, or filter the audio stream

2. **Black Box Processing**
   - The ASR engine runs inside the browser (native code)
   - It's a "black box" - you can't see or control what it processes
   - You only receive the final transcribed text
   - No way to tell it "only process audio from Speaker A"

3. **Post-Processing Only**
   - Your code receives transcripts **AFTER** ASR has processed everything
   - You can filter transcripts (hard-block policy) ✅
   - You cannot prevent ASR from processing unwanted audio ❌

### What We Currently Do (Post-Processing Filtering)

```
Audio Stream → ASR → Transcripts → Your Code → Filter → Accept/Reject
              (Processes          (You can only
               everything)         filter here)
```

**Current Flow:**
1. Microphone captures ALL audio (Speaker A + Speaker B + Background noise)
2. Web Speech API processes ALL audio → generates transcripts for everything
3. Your code receives transcripts
4. Your code analyzes voice features (pitch, volume, MFCC) in parallel
5. Your code compares features with locked speaker profile
6. Your code accepts or rejects transcripts (hard-block policy)

**Limitation:**
- ASR still processes audio from other speakers
- You're filtering transcripts, not audio
- Other speakers' audio is still being transcribed (wasted processing)

### What We Cannot Do (Pre-Processing Filtering)

```
Audio Stream → [Filter Speaker A] → ASR → Transcripts
              (This step is        (Only processes
               impossible)          Speaker A)
```

**Why It's Impossible:**
1. **No Audio Stream Access**: Web Speech API doesn't expose the raw audio stream
2. **No Pre-Processing Hook**: No way to process audio before it reaches ASR
3. **No Speaker Diarization Before ASR**: Can't identify speakers before transcription
4. **No Source Separation Before ASR**: Can't isolate Speaker A's audio before ASR

### To Achieve "Only Forward Speaker A Segments to ASR"

You would need a **Custom Streaming STT Pipeline**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                         │
│                                                             │
│  ┌──────────────┐                                           │
│  │  Microphone  │                                           │
│  │    Stream    │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         │ Raw Audio Stream                                  │
│         ▼                                                    │
│  ┌─────────────────────────┐                               │
│  │  AudioWorklet/          │                               │
│  │  MediaRecorder          │                               │
│  │  (Your Code)            │                               │
│  └──────┬──────────────────┘                               │
│         │                                                    │
│         │ Processed Audio                                    │
│         ▼                                                    │
│  ┌─────────────────────────┐                               │
│  │  Speaker Diarization    │                               │
│  │  / Source Separation    │                               │
│  │  (Identify Speaker A)   │                               │
│  └──────┬──────────────────┘                               │
│         │                                                    │
│         │ Only Speaker A Segments                           │
│         ▼                                                    │
│  ┌─────────────────────────┐                               │
│  │  Custom STT Service     │                               │
│  │  (Google Cloud, Azure,   │                               │
│  │   Deepgram, etc.)        │                               │
│  └──────┬──────────────────┘                               │
│         │                                                    │
│         │ Transcripts (Only Speaker A)                       │
│         ▼                                                    │
│  ┌─────────────────────────┐                               │
│  │  Your Application       │                               │
│  └─────────────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

#### Required Changes

1. **Replace Web Speech API**
   - Use AudioWorklet or MediaRecorder to capture raw audio
   - Process audio chunks yourself
   - Send audio to custom STT service (WebSocket/HTTP)

2. **Implement Speaker Diarization/Source Separation**
   - Real-time speaker identification
   - Separate Speaker A's audio from others
   - Only forward Speaker A segments to STT

3. **Custom STT Integration**
   - Integrate with cloud STT service (Google, Azure, Deepgram)
   - Handle streaming audio
   - Process transcripts

4. **Additional Complexity**
   - More code to maintain
   - Requires STT service API keys
   - Higher latency (network calls)
   - More expensive (STT service costs)

### Comparison Table

| Feature | Web Speech API (Current) | Custom STT Pipeline |
|---------|-------------------------|---------------------|
| **Audio Stream Access** | ❌ No | ✅ Yes |
| **Pre-Processing Audio** | ❌ No | ✅ Yes |
| **Filter Before ASR** | ❌ No | ✅ Yes |
| **Filter After ASR** | ✅ Yes | ✅ Yes |
| **Implementation Complexity** | ✅ Low | ❌ High |
| **Cost** | ✅ Free | ❌ Paid (STT service) |
| **Latency** | ✅ Low (local) | ❌ Higher (network) |
| **Browser Support** | ⚠️ Chrome only | ✅ All browsers |
| **Privacy** | ⚠️ Browser processes | ✅ Your control |

### Why Our Current Approach Works Well

Even though we can't filter audio before ASR, our **hard-block policy on transcripts** is effective because:

1. **Real-Time Voice Analysis**
   - We analyze audio features (pitch, volume, MFCC) in parallel with ASR
   - We can identify mismatches immediately
   - We reject transcripts from wrong speakers instantly

2. **Hysteresis System**
   - Prevents false rejections
   - Only rejects after sustained mismatches
   - Handles natural voice variations

3. **Echo-Aware Windows**
   - More lenient during/after agent speech
   - Prevents blocking real caller during barge-in

4. **Two-Step Authentication**
   - Wake phrase + confirmation
   - Voice consistency check
   - Ensures correct speaker is locked

5. **Wrong Lock Detection**
   - Automatically detects if wrong speaker is locked
   - Triggers re-authentication
   - Manual reset available

### Conclusion

**Current Architecture (Web Speech API):**
- ✅ Can filter transcripts (hard-block policy)
- ❌ Cannot filter audio before ASR
- ✅ Simple, free, low latency
- ✅ Works well for our use case

**Alternative Architecture (Custom STT Pipeline):**
- ✅ Can filter audio before ASR
- ✅ Can forward only Speaker A segments
- ❌ More complex, expensive, higher latency
- ❌ Requires significant architectural changes

**Recommendation:**
Our current approach is sufficient because:
1. We effectively filter transcripts in real-time
2. We have robust speaker verification
3. We prevent unauthorized speakers from being processed
4. The simplicity and cost-effectiveness outweigh the limitation

The limitation (ASR processing all audio) is acceptable because:
- We reject unwanted transcripts immediately
- No sensitive data is processed from wrong speakers
- The system is secure and effective

