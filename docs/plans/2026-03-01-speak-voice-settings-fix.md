# Speak Module Voice Settings Fix

## Problem
The speak page was using hardcoded voice settings (`lang = 'en-US'`, `rate = 0.9`) instead of respecting the user's voice configuration from the settings page.

## Solution
Integrated the TTS store settings into the speak page so that LLM responses use the same voice, speed, pitch, and volume configured in Settings.

## Changes Made

### 1. Import TTS Store
```typescript
import { useTTSStore } from '@/stores/tts-store';
```

### 2. Retrieve Voice Settings
```typescript
const voiceURI = useTTSStore((s) => s.voiceURI);
const speed = useTTSStore((s) => s.speed);
const pitch = useTTSStore((s) => s.pitch);
const volume = useTTSStore((s) => s.volume);
const hydrateTTS = useTTSStore((s) => s.hydrate);
```

### 3. Hydrate Settings on Mount
```typescript
useEffect(() => {
  hydrateTTS();
}, [hydrateTTS]);
```

### 4. Apply Settings to Speech Synthesis
```typescript
if (fullText && typeof window !== 'undefined' && window.speechSynthesis) {
  const utterance = new SpeechSynthesisUtterance(fullText);

  // Apply voice settings from TTS store
  if (voiceURI) {
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }

  utterance.rate = speed;
  utterance.pitch = pitch;
  utterance.volume = volume;

  window.speechSynthesis.speak(utterance);
}
```

## Testing
- Go to Settings > Voice & Speech
- Select a voice, adjust speed, pitch, and volume
- Navigate to Speak module and start a conversation
- Verify that the LLM's voice responses use your configured settings

## Files Modified
- `src/app/(app)/speak/[scenarioId]/page.tsx`
