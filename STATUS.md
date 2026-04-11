# The Negotiator — Build Status

## What's Built

### Core App (Phase 1) ✅
| Feature | File | Status |
|---------|------|--------|
| Next.js 15 + Tailwind scaffold | `package.json`, `next.config.ts` | Done |
| Dark theme UI | `src/app/globals.css` | Done |
| GitHub public API connector | `src/lib/githubContext.ts` + `src/app/api/github/route.ts` | Done |
| Instant hedge detection (regex, 20 patterns) | `src/lib/hedgeDetector.ts` | Done |
| Self-advocacy score (starts at 85, ±per phrase) | `src/app/page.tsx` | Done |
| OpenAI gpt-4o-mini analysis every 15s | `src/app/api/analyze/route.ts` | Done |
| Score gauge (arc, color-coded red/yellow/green) | `src/components/ScoreGauge.tsx` | Done |
| Session stats bar (hedges, duration, sparkline) | `src/components/SessionStats.tsx` | Done |
| AI talking points panel (GitHub-grounded) | `src/components/TalkingPoints.tsx` | Done |

### Speaker Diarization (Phase 2) ✅
| Feature | File | Status |
|---------|------|--------|
| Deepgram streaming WebSocket hook | `src/hooks/useDeepgramTranscription.ts` | Done |
| Word-level speaker grouping (speaker 0 = you, 1 = them) | `src/hooks/useDeepgramTranscription.ts` | Done |
| Deepgram API key server route | `src/app/api/deepgram-token/route.ts` | Done |
| Audio device selector in setup (auto-highlights BlackHole) | `src/components/SetupPanel.tsx` | Done |
| Two-column transcript (YOU \| THEM) | `src/components/TranscriptPanel.tsx` | Done |
| Hedge scoring only on YOUR speech | `src/app/page.tsx` | Done |
| GPT-4o-mini prompt aware of YOU/THEM labels | `src/app/api/analyze/route.ts` | Done |
| Talking points triggered by THEM questions | `src/app/api/analyze/route.ts` | Done |

---

## What's Left

### Must-have before demo
| Task | Notes |
|------|-------|
| **BlackHole system setup** | `brew install blackhole-2ch` → Audio MIDI Setup → Multi-Output Device. One-time, not code. |
| **Test end-to-end with real call** | Start a Google Meet, select BlackHole in the app, verify both columns populate |
| **Verify speaker 0 = you** | Deepgram assigns speaker 0 to first detected voice — make sure you speak first |

### Nice-to-have (if time allows)
| Task | Effort | Impact |
|------|--------|--------|
| Session summary screen after Stop | ~30 min | Shows total hedges, final score, score chart — good for demo close |
| Interim text display (in-progress speech) | ~20 min | Deepgram sends interim results; showing them makes the UI feel more alive |
| Manual speaker swap button | ~15 min | If Deepgram assigns speaker 0 to the VC instead of you, let user flip the labels |
| Assertive phrase highlights (green) | ~20 min | `hedgeDetector.ts` already scores assertive phrases but doesn't highlight them |
| Export transcript as text | ~15 min | Download the full YOU/THEM transcript after session |

### Known limitations
| Issue | Workaround |
|-------|------------|
| Deepgram takes ~2-3s to emit `speech_final` | Normal — not instant like regex. Regex fires immediately, Deepgram fires on utterance end |
| Speaker labels can flip mid-meeting | Deepgram re-numbers if it loses the audio stream. Keep the meeting continuous |
| BlackHole Mac-only | Windows users can use VB-Cable (same concept, different app) |
| Diarization needs 2+ distinct voices | Single-speaker audio = everything labeled speaker 0 |

---

## Environment Checklist
- [x] `OPENAI_API_KEY` in `.env.local`
- [x] `DEEPGRAM_API_KEY` in `.env.local`
- [ ] BlackHole installed + system audio routing configured
- [ ] Tested in Chrome (required — WebSocket + MediaRecorder)

## How to Run
```bash
cd /Users/rishbhajain/Documents/BobTheBuilders/Negotiator
npm run dev
# → http://localhost:3000
```
