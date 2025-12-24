# Custom STT Architecture: Pre-Processing Audio Before ASR

## Yes, You Can Filter Audio Before ASR!

You're absolutely correct! If we replace Web Speech API with AudioWorklet/MediaRecorder and implement speaker diarization/source separation, we **CAN** pass only Speaker A's audio to ASR.

## How It Would Work

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                         │
│                                                             │
│  ┌──────────────┐                                           │
│  │  Microphone  │                                           │
│  │    Stream    │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         │ Raw Audio Stream (All Speakers + Noise)           │
│         ▼                                                    │
│  ┌─────────────────────────┐                               │
│  │  AudioWorklet/          │                               │
│  │  MediaRecorder          │                               │
│  │  (Capture Raw Audio)    │                               │
│  └──────┬──────────────────┘                               │
│         │                                                    │
│         │ Audio Chunks (e.g., 512 samples @ 16kHz)          │
│         ▼                                                    │
│  ┌─────────────────────────┐                               │
│  │  Real-Time Processing   │                               │
│  │  ┌───────────────────┐ │                               │
│  │  │ Speaker Diarization│ │                               │
│  │  │ / Source Separation│ │                               │
│  │  │ (Identify Speaker A)│ │                               │
│  │  └───────────────────┘ │                               │
│  └──────┬──────────────────┘                               │
│         │                                                    │
│         │ Only Speaker A Audio Segments                     │
│         │ (Filtered, Clean Audio)                           │
│         ▼                                                    │
│  ┌─────────────────────────┐                               │
│  │  Custom STT Service     │                               │
│  │  (Google Cloud, Azure,  │                               │
│  │   Deepgram, AssemblyAI) │                               │
│  └──────┬──────────────────┘                               │
│         │                                                    │
│         │ Transcripts (Only from Speaker A)                 │
│         ▼                                                    │
│  ┌─────────────────────────┐                               │
│  │  Your Application       │                               │
│  │  (No filtering needed!) │                               │
│  └─────────────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Approach

### Step 1: Capture Raw Audio

```javascript
// Using AudioWorklet to capture raw audio
const audioContext = new AudioContext({ sampleRate: 16000 });
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// Create AudioWorklet for real-time processing
await audioContext.audioWorklet.addModule('speaker-processor.js');
const workletNode = new AudioWorkletNode(audioContext, 'speaker-processor');

// Connect microphone to worklet
const source = audioContext.createMediaStreamSource(stream);
source.connect(workletNode);

// Receive processed audio chunks
workletNode.port.onmessage = (event) => {
  const audioChunk = event.data.audioChunk;
  const speakerId = event.data.speakerId;
  
  if (speakerId === 'speakerA') {
    // Only send Speaker A audio to STT
    sendToSTT(audioChunk);
  }
};
```

### Step 2: Speaker Diarization / Source Separation

#### Option A: Speaker Diarization (Identify Who Spoke When)

```javascript
// Real-time speaker diarization
class SpeakerDiarizationProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const audioChunk = input[0];
    
    // Extract features (MFCC, pitch, etc.)
    const features = extractFeatures(audioChunk);
    
    // Compare with known speaker profiles
    const speakerId = identifySpeaker(features);
    
    // Only forward if it's Speaker A
    if (speakerId === 'speakerA') {
      this.port.postMessage({
        audioChunk: audioChunk,
        speakerId: 'speakerA'
      });
    }
    
    return true;
  }
}
```

**Pros:**
- Identifies which speaker is talking
- Can work with your existing voiceprint system
- Lower computational cost

**Cons:**
- Doesn't actually separate audio streams
- Still contains some background noise
- May have overlap when multiple speakers talk

#### Option B: Source Separation (Actually Separate Audio Streams)

```javascript
// Real-time source separation (more complex)
class SourceSeparationProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const mixedAudio = input[0];
    
    // Use deep learning model for source separation
    // (e.g., Conv-TasNet, Spleeter, or custom model)
    const separatedSources = separateSources(mixedAudio);
    
    // Extract Speaker A's audio
    const speakerAAudio = separatedSources['speakerA'];
    
    // Send only Speaker A audio
    this.port.postMessage({
      audioChunk: speakerAAudio,
      speakerId: 'speakerA'
    });
    
    return true;
  }
}
```

**Pros:**
- Actually separates audio streams
- Cleaner audio for Speaker A
- Better noise reduction

**Cons:**
- Much more computationally intensive
- Requires trained models
- Higher latency
- May introduce artifacts

### Step 3: Send to Custom STT Service

```javascript
// Send filtered audio to STT service
async function sendToSTT(audioChunk) {
  // Convert to required format (e.g., PCM, WAV)
  const audioBuffer = convertToFormat(audioChunk);
  
  // Send to STT service (WebSocket or HTTP)
  if (sttWebSocket.readyState === WebSocket.OPEN) {
    sttWebSocket.send(audioBuffer);
  }
}

// Receive transcripts
sttWebSocket.onmessage = (event) => {
  const transcript = JSON.parse(event.data).transcript;
  // Process transcript (no filtering needed - already filtered!)
  processTranscript(transcript);
};
```

## Technical Requirements

### 1. Audio Processing Libraries

**For Speaker Diarization:**
- **pyannote.audio** (Python, but can be ported to JavaScript)
- **SpeechBrain** (Python)
- **Custom implementation** using your existing voiceprint system

**For Source Separation:**
- **Spleeter** (TensorFlow.js)
- **Conv-TasNet** (TensorFlow.js)
- **Custom trained models**

### 2. STT Service Options

**Cloud Services:**
- **Google Cloud Speech-to-Text**: High accuracy, streaming support
- **Azure Speech Services**: Good accuracy, streaming support
- **Deepgram**: Fast, streaming-first
- **AssemblyAI**: Good accuracy, real-time
- **Rev.ai**: High accuracy

**Self-Hosted:**
- **Whisper** (OpenAI): Can be self-hosted, very accurate
- **Wav2Vec2**: Facebook's model
- **Custom models**

### 3. Real-Time Processing Considerations

**Latency Requirements:**
- Audio chunk size: 512-2048 samples (32-128ms at 16kHz)
- Processing time: < 50ms for real-time
- Network latency: < 100ms for good UX
- Total latency: < 200ms acceptable

**Computational Requirements:**
- Speaker diarization: Moderate (can run in browser)
- Source separation: High (may need Web Workers or WebGPU)
- STT: Handled by service (no local computation)

## Comparison: Current vs Custom STT

### Current Architecture (Web Speech API)

```
✅ Pros:
- Simple implementation
- Free (no STT service costs)
- Low latency (local processing)
- No network dependency
- Works offline (once started)

❌ Cons:
- ASR processes all audio
- Cannot filter before ASR
- Only Chrome support
- Limited control
```

### Custom STT Architecture

```
✅ Pros:
- Can filter audio before ASR
- Only processes Speaker A audio
- More efficient (no wasted processing)
- Better privacy (you control what's sent)
- Works in all browsers
- More control over processing

❌ Cons:
- More complex implementation
- Requires STT service (costs money)
- Higher latency (network calls)
- Requires speaker diarization/separation
- More code to maintain
- Computational overhead
```

## Implementation Challenges

### 1. Real-Time Speaker Diarization

**Challenge:**
- Need to identify speaker in real-time (< 50ms)
- Must work with overlapping speech
- Need to handle speaker changes quickly

**Solution:**
- Use lightweight models optimized for real-time
- Pre-compute speaker profiles during wake phrase
- Use sliding window approach
- Cache recent decisions

### 2. Source Separation Quality

**Challenge:**
- Real-time source separation is computationally expensive
- Quality may not be perfect
- May introduce artifacts

**Solution:**
- Use pre-trained models optimized for real-time
- Consider simpler approaches (beamforming, noise reduction)
- Accept some quality trade-offs for speed

### 3. Latency Management

**Challenge:**
- Processing adds latency
- Network calls add latency
- Need to balance quality vs speed

**Solution:**
- Use streaming STT (not batch)
- Process in parallel where possible
- Use Web Workers for heavy computation
- Optimize chunk sizes

### 4. Cost Management

**Challenge:**
- STT services charge per minute/hour
- Costs can add up with many users

**Solution:**
- Use efficient chunking (don't send silence)
- Consider self-hosted solutions for scale
- Use caching where possible
- Monitor usage

## Hybrid Approach (Recommended)

You could combine both approaches:

```
1. Use AudioWorklet to capture raw audio
2. Do lightweight speaker identification (your existing voiceprint system)
3. Only send Speaker A segments to STT service
4. Keep Web Speech API as fallback
```

**Benefits:**
- Best of both worlds
- Can fall back to current approach if STT fails
- Gradual migration possible
- Can optimize costs

## Code Example: Basic Implementation

```javascript
// AudioWorklet Processor
class SpeakerFilterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.speakerProfile = null; // Loaded from wake phrase
    this.bufferSize = 512;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const inputChannel = input[0];

    // Accumulate samples
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];

      if (this.bufferIndex >= this.bufferSize) {
        // Extract features
        const features = this.extractFeatures(this.buffer);
        
        // Check if it matches Speaker A
        if (this.speakerProfile && this.isSpeakerA(features)) {
          // Send to STT service
          this.port.postMessage({
            type: 'audio',
            data: new Float32Array(this.buffer)
          });
        }
        
        this.bufferIndex = 0;
      }
    }

    return true;
  }

  extractFeatures(audio) {
    // Extract pitch, volume, MFCC (similar to your current code)
    const rms = this.calculateRMS(audio);
    const pitch = this.calculatePitch(audio);
    const mfcc = this.calculateMFCC(audio);
    
    return { rms, pitch, mfcc };
  }

  isSpeakerA(features) {
    // Compare with speaker profile (your existing logic)
    if (!this.speakerProfile) return false;
    
    const pitchMatch = this.comparePitch(features.pitch, this.speakerProfile.pitch);
    const volumeMatch = this.compareVolume(features.rms, this.speakerProfile.volume);
    const mfccMatch = this.compareMFCC(features.mfcc, this.speakerProfile.mfcc);
    
    return pitchMatch && volumeMatch && mfccMatch;
  }
}

registerProcessor('speaker-filter-processor', SpeakerFilterProcessor);
```

## Conclusion

**Yes, you can absolutely do this!** 

By replacing Web Speech API with AudioWorklet/MediaRecorder and implementing speaker diarization/source separation, you can:

1. ✅ Capture raw audio
2. ✅ Identify Speaker A in real-time
3. ✅ Filter out other speakers and noise
4. ✅ Send only Speaker A audio to STT
5. ✅ Receive clean transcripts (no filtering needed)

**However, consider:**
- Is the added complexity worth it?
- Can you handle the costs?
- Is the latency acceptable?
- Do you have resources for maintenance?

**For most use cases, the current post-processing approach is sufficient and more practical.** But if you need true pre-processing filtering, this is the way to do it!

