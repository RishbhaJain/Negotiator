# The Negotiator

Real-time pitch coach for high-stakes meetings. Transcribes your conversation live, tracks your speaking confidence, and surfaces talking points grounded in your GitHub work — triggered the moment the other person stops talking.

![The Negotiator](https://img.shields.io/badge/built%20with-Next.js-black) ![Claude](https://img.shields.io/badge/AI-Claude%20Haiku-orange) ![Deepgram](https://img.shields.io/badge/speech-Deepgram-blue)

---

## What it does

- **Live transcription** — streams audio through Deepgram, splitting speech into a YOU column and a THEM column
- **Hedge detection** — flags weak language in real time ("I think", "maybe", "kind of") and adjusts your advocacy score
- **Talking points** — sends the transcript to Claude the moment the other person goes quiet, generating specific, actionable points grounded in your actual GitHub repos
- **GitHub context** — you pick which repos to load; the AI uses commit history, README content, and language stats to make suggestions relevant to your work

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/RishbhaJain/Negotiator.git
cd Negotiator
npm install
```

### 2. Add API keys

Create a `.env.local` file in the root:

```
DEEPGRAM_API_KEY=your_deepgram_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

- **Deepgram** — get a free key at [deepgram.com](https://deepgram.com)
- **Anthropic** — get a key at [console.anthropic.com](https://console.anthropic.com)

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Chrome** (required for MediaRecorder API).

---

## How to use

1. **Enter your GitHub username** — public repos only, no token needed
2. **Pick repos** — select which repos to load as context (defaults to your 3 most recent)
3. **Select audio input** — use your Mac mic for single-person use, or route system audio through [BlackHole](https://existingaudio.com/blackhole) to capture both sides of a call
4. **Start Meeting** — the session goes live

### During a session

- **Space bar** (or click a transcript column) to toggle whose turn it is — all speech goes to whichever speaker is active
- Watch your **Advocacy Score** in real time; hedging phrases drop it, confident statements raise it
- **Talking Points** update automatically ~1.5 seconds after the other person stops talking

---

## Two-mic vs one-mic

| Setup | How |
|---|---|
| **One mic (you only)** | Use Space to manually flip between YOU and THEM before each person speaks |
| **Both sides of a call** | Install BlackHole, create a Multi-Output Device in Audio MIDI Setup, route Zoom/Meet audio through it, then select BlackHole as the input — Deepgram's diarization separates the voices automatically |

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router) |
| Transcription | Deepgram Nova-2 with speaker diarization |
| AI analysis | Anthropic Claude Haiku 4.5 |
| GitHub data | GitHub REST API (public, no token) |
| Styling | Tailwind CSS |
