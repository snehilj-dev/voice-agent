# Voice Agent Implementation Documentation

## Table of Contents
1. [Overview](#overview)
2. [What Existed Before](#what-existed-before)
3. [What Was Added](#what-was-added)
4. [What Was Removed](#what-was-removed)
5. [What Was Updated](#what-was-updated)
6. [Implementation Details](#implementation-details)
7. [How It Works](#how-it-works)

---

## Overview

This documentation covers the complete implementation of a voice-based admissions counseling agent with advanced speaker recognition and filtering capabilities. The system ensures that only the authenticated caller (main speaker) can interact with the agent, blocking all other voices and background noise.

---

## What Existed Before

### Initial State
The system had a basic voice agent implementation with:

1. **Basic Speech Recognition**
   - Web Speech API for transcription
   - Simple speech-to-text conversion
   - Basic audio playback

2. **Simple Speaker Filtering**
   - Basic volume-based filtering
   - Pitch and timbre checks
   - MFCC (Mel-frequency cepstral coefficients) for voice identification
   - Simple calibration system

3. **Basic Echo Detection**
   - Simple text matching to prevent agent from hearing itself
   - Basic echo cancellation via WebRTC constraints

4. **Simple Call Flow**
   - Start/stop call functionality
   - Basic conversation flow
   - No authentication mechanism
   - No wake phrase detection
   - No confirmation step

5. **Basic State Management**
   - Simple state object with basic flags
   - No re-authentication mechanism
   - No wrong lock detection
   - No ending phase detection

---

## What Was Added

### 1. Wake Phrase Detection System

#### 1.1 State Variables (Added in sequence)
- `waitingForWakePhrase`: Boolean flag to track if system is waiting for wake phrase
- `wakePhraseDetected`: Boolean flag to track if wake phrase was detected
- `confirmationStep`: Boolean flag to track if system is in confirmation phase
- `wakePhraseVoiceFeatures`: Object to store voice features from wake phrase
- `collectedName`: String to store the name collected during confirmation
- `pendingIntentCheck`: Boolean flag to prevent concurrent intent checks
- `reAuthMode`: Boolean flag to track re-authentication mode
- `wrongLockDetected`: Boolean flag to track if wrong lock was detected
- `endingPhase`: Boolean flag to track if call is in ending phase
- `endingSilenceTimeout`: Timer for auto-ending after agent's closing
- `lastAgentQuestion`: String to track the last question asked by agent
- `followUpStage`: Number to track proactive follow-up stage (0, 1, or 2)
- `followUpAlternate`: Boolean to alternate between "Are you there?" and "Did you hear me?"

#### 1.2 Wake Phrase Constants
- `WAKE_PHRASES`: Array of wake phrase patterns for fuzzy matching
- Includes variations like "riya start counselling", "hello riya start", etc.
- Supports English, Hindi, and Hinglish variations

#### 1.3 Wake Phrase Detection Functions
- `fuzzyMatchWakePhrase(transcript)`: Fuzzy matching function using Levenshtein distance
- `calculateSimilarity(str1, str2)`: Calculates similarity between two strings
- `normalizeTextForWakePhrase(text)`: Normalizes text for matching (handles plurals, etc.)
- `hasRiyaAndKeyword(transcript)`: Checks if transcript contains "Riya" and a relevant keyword
- `isWakePhraseDetectionActive()`: Checks if wake phrase detection should be active
- `handleWakePhraseDetected(transcript)`: Handles wake phrase detection and stores voice features

#### 1.4 Intent Check Functions
- `checkWakePhraseIntent(transcript)`: LLM-based intent check for wake phrase
- `checkClearIntent(transcript)`: LLM-based clear intent verification
- Both functions use WebSocket message handler chaining to prevent conflicts

#### 1.5 Wake Phrase Detection Flow
- Multi-layer detection: keyword presence → fuzzy matching → VAD confidence → LLM intent → clear intent verification
- Only activates when call is not active or in re-auth mode
- Blocks all other transcripts until wake phrase is detected

### 2. Two-Step Authentication (Initiator Handshake)

#### 2.1 Confirmation Step
- After wake phrase detection, system asks for confirmation question
- Language-aware confirmation questions (English/Hindi/Hinglish)
- Stores voice features from both wake phrase and confirmation
- Compares voice features to ensure same speaker

#### 2.2 Voice Consistency Check
- `checkVoiceConsistency(wakeFeatures, confirmFeatures)`: Compares voice features
- Checks pitch (within ±30%), volume (within ±50%), and MFCC similarity
- Requires at least one valid feature check
- Requires at least 50% of valid checks to pass
- Fails if no features are available (security requirement)

### 3. Speaker Locking and Filtering

#### 3.1 Mismatch Tracking
- `mismatchCount`: Counter for consecutive mismatches
- `lastMismatchTime`: Timestamp of last mismatch
- Hysteresis system: requires 30+ consecutive mismatches (~1 second) before rejection
- Prevents false rejections from brief noise or voice variations

#### 3.2 Wrong Lock Detection
- `checkWrongLockRecovery()`: Automatically detects wrong lock
- Triggers after 30+ consecutive mismatches or 10 seconds of continuous mismatch
- Sets `reAuthMode` and `waitingForWakePhrase` to true
- Agent asks user to repeat wake phrase

#### 3.3 Manual Reset Button
- "Reset Speaker" button appears when wrong lock is detected
- Allows manual re-authentication
- Sets all necessary flags for re-identification

### 4. Echo Detection and Prevention

#### 4.1 Enhanced Echo Detection
- Tracks `currentSpokenText`: Accumulates agent's spoken text
- Fuzzy matching against user input to detect echo
- Blocks echo if more than 2 words match
- Echo-aware windows: More permissive during/after agent speech

#### 4.2 Echo-Aware Windows
- `lastAgentSpeechEndTime`: Tracks when agent speech ended
- `isDuringAgentSpeechOrEchoTail()`: Checks if we're in echo window
- More lenient filtering during echo windows (4 words instead of 2)
- Prevents blocking real user speech during barge-in

### 5. Proactive Follow-up System

#### 5.1 Follow-up Timer
- `followUpTimer`: Interval timer for proactive follow-ups
- Created in `startCall()`, cleared in `stopCall()`
- Runs every 1 second to check for follow-up needs

#### 5.2 Follow-up Logic
- `checkProactiveFollowUp()`: Checks if follow-up is needed
- Stage 1 (8 seconds): Asks "Are you there?" or "Did you hear me?" (alternating)
- Stage 2 (another 4 seconds): Moves to next question
- Timer resets on user response, new agent question, or explicit "didn't hear" phrases

#### 5.3 Question Repetition
- Only repeats if caller explicitly asks ("repeat", "say again", "didn't hear")
- Resets follow-up timer when question is repeated

### 6. Ending Phase Detection

#### 6.1 Ending Detection
- `checkEndingPhase(transcript)`: Detects ending intent
- Keyword-based detection: "thank you", "bye", "that's all", etc.
- LLM-based intent check for context-aware detection
- Hybrid approach: User-initiated with context check + Agent-initiated

#### 6.2 Ending Flow
- Agent detects task completion → asks "Is there anything else?"
- User confirms → agent closes → auto-ends after 2-3 seconds
- Prevents premature endings (context check ensures natural ending point)

### 7. Server-Side Intent Checks

#### 7.1 New Message Types
- `wake_phrase_intent_check`: LLM check for wake phrase intent
- `clear_intent_check`: LLM check for clear intent
- `ending_intent_check`: LLM check for ending intent
- `agent_speak`: Agent-initiated speech (TTS)

#### 7.2 Server Handlers
- Each intent check has dedicated handler in `server.ts`
- Uses GPT-4o-mini for intent detection
- Returns yes/no responses for intent checks
- `agent_speak` handler synthesizes speech and sends audio

### 8. Audio Queue Management

#### 8.1 Audio Queue System
- `audioQueue`: Array to store audio URLs
- `processQueue()`: Processes audio queue sequentially
- `isPlaying`: Flag to prevent concurrent playback
- `activeAudio`: Reference to currently playing audio

#### 8.2 Audio Playback
- Plays audio chunks sequentially
- Tracks when agent speech ends for echo detection
- Handles retry logic for failed audio playback
- Cleans up on call end

### 9. State Management Enhancements

#### 9.1 Comprehensive State Reset
- All authentication flags reset in `stopCall()`
- All mismatch tracking reset in `stopCall()`
- All follow-up state reset in `stopCall()`
- Prevents state pollution across calls

#### 9.2 State Initialization
- Proper initialization in `startCall()`
- Resets speaker profile for new call
- Clears voiceprint history
- Reloads persistent voiceprints from localStorage

---

## What Was Removed

### 1. Global Timer Initialization
- **Removed**: Global `followUpTimer` initialization at page load
- **Reason**: Timer should be created per call, not globally
- **Impact**: Prevents timer from running before call starts

### 2. Duplicate Audio Handler
- **Removed**: Duplicate `activeAudio.onended` handler that replaced the original
- **Reason**: Original handler contains critical queue processing logic
- **Impact**: Prevents audio queue from breaking

### 3. Premature Flag Setting
- **Removed**: Premature `state.wakePhraseDetected = true` in socket message handler
- **Reason**: Flag should only be set after clear intent verification
- **Impact**: Prevents false wake phrase detection

---

## What Was Updated

### 1. Speaker Filtering Logic

#### 1.1 Hysteresis System
- **Before**: Rejected on single mismatch
- **After**: Requires 30+ consecutive mismatches (~1 second) before rejection
- **Reason**: Prevents false rejections from brief noise or voice variations

#### 1.2 Mismatch Counting
- **Before**: Counted mismatches during calibration phase
- **After**: Only counts mismatches after calibration is complete
- **Reason**: Prevents stale mismatch counts from carrying into active conversation

#### 1.3 Mismatch Reset Points
- **Added**: Reset when voice consistency check passes
- **Added**: Reset when confirmation step fails
- **Added**: Reset when calibration completes
- **Reason**: Ensures clean state at each transition

### 2. Voice Consistency Check

#### 2.1 Null Value Handling
- **Before**: Coerced null to 0, causing false rejections
- **After**: Skips check if value is null/undefined, defaults to true
- **Reason**: Prevents false rejections when pitch/volume extraction fails

#### 2.2 Security Enhancement
- **Before**: Defaulted all checks to true when features unavailable
- **After**: Requires at least one valid feature check, fails if none available
- **Reason**: Prevents security bypass when features are unavailable

#### 2.3 Check Requirements
- **Before**: All checks defaulted to true
- **After**: Requires at least 50% of valid checks to pass
- **Reason**: Ensures meaningful voice verification

### 3. Wrong Lock Detection

#### 3.1 Threshold Update
- **Before**: Triggered after 3 consecutive mismatches (~90ms)
- **After**: Triggers after 30+ consecutive mismatches (~1 second)
- **Reason**: Prevents false positives from brief background noise

#### 3.2 Flag Management
- **Added**: Sets `waitingForWakePhrase = true` when wrong lock detected
- **Added**: Resets `wrongLockDetected = false` after successful re-authentication
- **Reason**: Ensures proper state management during re-authentication

### 4. Message Handler System

#### 4.1 Handler Chaining
- **Before**: Replaced `socket.onmessage` directly, causing conflicts
- **After**: Chains handlers using `_nextHandler` property
- **Reason**: Prevents handler conflicts when multiple checks run concurrently

#### 4.2 Concurrent Check Prevention
- **Added**: `pendingIntentCheck` flag to prevent concurrent checks
- **Added**: Guard to ignore transcripts during active intent check
- **Reason**: Prevents handler conflicts and message loss

### 5. Promise Chain Fix

#### 5.1 Boolean Check
- **Before**: `if (hasClearIntent)` - always true (Promise is truthy)
- **After**: `if (hasClearIntent === true)` - explicit boolean check
- **Reason**: Correctly evaluates promise result

### 6. Audio Handler

#### 6.1 Combined Functionality
- **Before**: Two separate `onended` handlers (one for queue, one for echo tracking)
- **After**: Single handler with both functionalities
- **Reason**: Prevents handler replacement from breaking queue processing

### 7. State Reset in stopCall()

#### 7.1 Comprehensive Reset
- **Added**: Reset for `reAuthMode`
- **Added**: Reset for `confirmationStep`
- **Added**: Reset for `wakePhraseDetected`
- **Added**: Reset for `wakePhraseVoiceFeatures`
- **Added**: Reset for `pendingIntentCheck`
- **Added**: Reset for `waitingForWakePhrase`
- **Added**: Reset for `endingPhase`
- **Reason**: Prevents state pollution across calls

### 8. LLM Prompt Updates

#### 8.1 Natural Conversation
- **Added**: Instruction to continue naturally after each answer
- **Added**: Instruction to immediately ask next question
- **Added**: Instruction to handle "didn't hear" scenarios
- **Reason**: Ensures natural, interactive conversation flow

### 9. Echo Detection

#### 9.1 Lenient Echo Windows
- **Before**: 2-word threshold for echo detection
- **After**: 4-word threshold during echo-aware windows
- **Reason**: Prevents blocking valid user speech during barge-in

#### 9.2 Low Confidence Filtering
- **Before**: Blocked low confidence speech
- **After**: Only blocks if confidence < 0.1 AND volume < 0.01
- **Reason**: Prevents blocking valid speech with low confidence

---

## Implementation Details

### 1. Wake Phrase Detection Flow

```
1. User clicks "Start Call"
2. System requests microphone permission
3. Sets `waitingForWakePhrase = true`
4. UI shows: "Ready. Please say 'Riya start counselling' to begin"
5. User says wake phrase
6. System checks:
   - Keyword presence (Riya + keyword)
   - Fuzzy matching
   - VAD confidence (>0.6)
   - LLM intent check
   - Clear intent verification
7. If all pass → Ask confirmation question
8. User provides name
9. System checks voice consistency
10. If consistent → Lock initiated → Send name to LLM → Start conversation
```

### 2. Voice Consistency Check Flow

```
1. Collect voice features from wake phrase:
   - Volume (RMS)
   - Pitch
   - Timbre (spectral centroid)
   - MFCC

2. Collect voice features from confirmation:
   - Same features as above

3. Compare features:
   - Pitch ratio (must be 0.7-1.3)
   - Volume ratio (must be 0.5-1.5)
   - MFCC similarity (must be >0.6)

4. Requirements:
   - At least one valid feature check
   - At least 50% of valid checks must pass

5. If consistent → Lock speaker
6. If not consistent → Ask to repeat wake phrase
```

### 3. Speaker Filtering Flow

```
1. Audio frame arrives
2. Calculate voice features:
   - RMS volume
   - Pitch
   - Timbre
   - MFCC

3. Compare with baseline:
   - Volume ratio
   - Pitch ratio
   - Timbre ratio
   - MFCC similarity

4. Check for mismatch:
   - If mismatch → increment mismatchCount
   - If no mismatch → reset mismatchCount

5. Hysteresis check:
   - If mismatchCount < 30 → Allow (hysteresis)
   - If mismatchCount >= 30 → Reject

6. Echo-aware window check:
   - If during/after agent speech → More lenient
   - Otherwise → Normal filtering

7. If all checks pass → Accept transcript
8. If any check fails → Reject transcript
```

### 4. Wrong Lock Detection Flow

```
1. Monitor mismatch patterns:
   - Track consecutive mismatches
   - Track time since last mismatch

2. Check triggers:
   - 30+ consecutive mismatches
   - 10 seconds of continuous mismatch

3. If triggered:
   - Set wrongLockDetected = true
   - Set reAuthMode = true
   - Set waitingForWakePhrase = true
   - Show reset speaker button
   - Agent asks to repeat wake phrase

4. User repeats wake phrase
5. System verifies voice consistency
6. If consistent → Reset flags → Continue conversation
7. If not consistent → Ask again
```

### 5. Proactive Follow-up Flow

```
1. Agent asks a question
2. System sets lastAgentQuestion = question text
3. Start follow-up timer (checks every 1 second)

4. Stage 1 (8 seconds):
   - If no response → Agent asks "Are you there?" or "Did you hear me?"
   - Alternates between the two

5. Stage 2 (another 4 seconds):
   - If still no response → Agent moves to next question

6. Timer resets on:
   - User response
   - New agent question
   - Explicit "didn't hear" phrase
```

### 6. Ending Phase Flow

```
1. User says ending keyword OR agent detects completion
2. System checks context:
   - Is task complete?
   - Is this a natural ending point?
   - LLM intent check

3. If ending intent confirmed:
   - Agent asks "Is there anything else?"
   - User confirms
   - Agent closes
   - Auto-end after 2-3 seconds

4. If not ending intent:
   - Agent continues conversation
```

---

## How It Works

### Overall Architecture

1. **Call Start**
   - User clicks "Start Call"
   - System requests microphone
   - Initializes VAD (Voice Activity Detection)
   - Sets `waitingForWakePhrase = true`
   - Waits for wake phrase

2. **Wake Phrase Detection**
   - Multi-layer detection system
   - Fuzzy matching + LLM intent check
   - Clear intent verification
   - Stores voice features

3. **Confirmation Step**
   - Asks for name
   - Collects voice features
   - Compares with wake phrase features
   - Locks speaker if consistent

4. **Active Conversation**
   - Only accepts speech from locked speaker
   - Filters out other voices and background noise
   - Handles barge-in gracefully
   - Proactive follow-ups if no response

5. **Wrong Lock Recovery**
   - Automatically detects wrong lock
   - Asks for re-authentication
   - Manual reset button available

6. **Ending Phase**
   - Context-aware ending detection
   - Prevents premature endings
   - Natural conversation closure

### Key Features

1. **Hard-Block Policy**: Only accepts speech from authenticated speaker
2. **Hysteresis**: Prevents false rejections from brief noise
3. **Echo-Aware Windows**: More lenient during/after agent speech
4. **Session Drift Handling**: Adapts to natural voice variations
5. **Proactive Follow-ups**: Ensures conversation doesn't stall
6. **Natural Conversation**: Agent asks for clarification when confused

### Security Measures

1. **Two-Step Authentication**: Wake phrase + confirmation
2. **Voice Consistency Check**: Requires matching voice features
3. **Feature Validation**: Fails if no features available
4. **Re-authentication**: Required if wrong lock detected
5. **State Reset**: Prevents state pollution across calls

---

## Conclusion

This implementation provides a robust, secure voice-based admissions counseling agent with advanced speaker recognition and filtering capabilities. The system ensures that only the authenticated caller can interact with the agent, while maintaining a natural, interactive conversation flow.

