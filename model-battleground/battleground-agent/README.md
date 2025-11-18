<a href="https://livekit.io/">
  <img src="./.github/assets/livekit-mark.png" alt="LiveKit logo" width="100" height="100">
</a>

# LiveKit Agents Starter - Python

A complete starter project for building voice AI apps with [LiveKit Agents for Python](https://github.com/livekit/agents) and [LiveKit Cloud](https://cloud.livekit.io/).

The starter project includes:

- A simple voice AI assistant, ready for extension and customization
- A voice AI pipeline with [models](https://docs.livekit.io/agents/models) from OpenAI, Cartesia, and AssemblyAI served through LiveKit Cloud
  - Easily integrate your preferred [LLM](https://docs.livekit.io/agents/models/llm/), [STT](https://docs.livekit.io/agents/models/stt/), and [TTS](https://docs.livekit.io/agents/models/tts/) instead, or swap to a realtime model like the [OpenAI Realtime API](https://docs.livekit.io/agents/models/realtime/openai)
- Eval suite based on the LiveKit Agents [testing & evaluation framework](https://docs.livekit.io/agents/build/testing/)
- [LiveKit Turn Detector](https://docs.livekit.io/agents/build/turns/turn-detector/) for contextually-aware speaker detection, with multilingual support
- [Background voice cancellation](https://docs.livekit.io/home/cloud/noise-cancellation/)
- Integrated [metrics and logging](https://docs.livekit.io/agents/build/metrics/)
- A Dockerfile ready for [production deployment](https://docs.livekit.io/agents/ops/deployment/)

This starter app is compatible with any [custom web/mobile frontend](https://docs.livekit.io/agents/start/frontend/) or [SIP-based telephony](https://docs.livekit.io/agents/start/telephony/).

## Current multi-agent architecture (DevDay battleground)

> **Context:** The repo now runs a “battleground” experience with three cooperating voice agents and a custom frontend dashboard. The information below captures the current wiring so another contributor can continue the work-in-progress items (notably transcript routing for user utterances).

### Backend workers

| File | Agent identity | Purpose | Notes |
|------|----------------|---------|-------|
| `src/agent.py` | `agent-1` | Primary LiveKit worker (always running) | Installs the RPC extension, emits metrics, and exposes the `model_battleground.agent.dispatch` RPC endpoint so the UI can explicitly dispatch additional workers. |
| `src/battleground_agent_2.py` | `agent-2` | Secondary worker | Identical voice pipeline; metrics stream tagged with `agent_id="agent-2"`. No dispatch RPC exposed (children are passive). |
| `src/battleground_agent_3.py` | `agent-3` | Tertiary worker | Same as Agent 2. |

Common behavior across agents:

- **Voice pipeline:** AssemblyAI STT + GPT‑4.1‑mini LLM + Cartesia TTS, multilingual turn detector, Silero VAD, preemptive generation enabled.
- **Metrics:** We normalize STT transcription delay (`EOUMetrics.transcription_delay`), LLM TTFT, and TTS TTFB into percentage bars with raw latency in milliseconds. Every metrics payload includes both `agent_id` and the local participant identity (`participant_identity`) so the frontend can correlate data streams with specific cards/participants.
- **RPC topic:** All agents emit to `model_battleground.agent.metrics`. Using the LiveKit extensions RPC helper keeps the payload schema consistent (see `AgentMetricsPayload` in each file). To avoid “Method not supported” errors we build a snapshot task that iterates remote participants and sends the metrics payload to the first client that advertises the RPC method.

Additional logic in `agent.py`:

- Creates a single `LiveKitAPI` instance per process and, via `_handle_dispatch_rpc`, accepts `agent_name` + optional metadata from the frontend. When the UI requests `"battleground-agent-2"` or `"battleground-agent-3"`, the worker issues `agent_dispatch.create_dispatch` so those named workers join the current room. Automatic dispatch is effectively disabled because `WorkerOptions(name=...)` is set per worker and the UI now controls which agents enter the call.

### Frontend dashboard (`frontend/components/app/session-view.tsx`)

The React/Next.js dashboard renders three `AgentCard` columns:

- Static metadata is defined in the `AGENT_CARD_DEFINITIONS` array (agent id, display name, dispatch target name, seed metrics/messages, and known participant identities).
- Runtime state:
  - `agentMetrics`: map of `agent_id → AgentMetrics` updated from RPC payloads.
  - `agentStatuses`: whether each card is “dispatched” (turns the green pip on/off). Agent 1 is marked active by default; Agents 2/3 flip on after a dispatch RPC succeeds or as soon as metrics arrive for them.
  - `identityToAgentId`: dynamic lookup from LiveKit participant identity to internal agent id. Initialized from the definition list, then updated whenever a metrics payload includes a new `participant_identity`. This is crucial for transcript routing.
  - `dispatchingAgents`: tracks which cards are mid-dispatch so the UI can disable the “Dispatch Agent” button and show a spinner label.
  - `agentMessages`: memoized map of `agent_id → ChatMessage[]`. Every transcript (from `useChatMessages`) is assigned using `identityToAgentId`. Agent utterances update `lastAgentId`, and the next user transcript (local participant) is attributed to that same agent so conversations stay grouped.

### RPC endpoints and payloads

- **Metrics (`model_battleground.agent.metrics`):**
  ```jsonc
  {
    "agent_id": "agent-2",
    "participant_identity": "battleground-agent-2-XYZ",
    "stt": { "label": "...", "value": 42.0, "latency_ms": 210.5 },
    "llm": { "..." },
    "tts": { "..." },
    "ts": 1731000000.123
  }
  ```
  The frontend listens for this RPC topic, updates the metrics map, and refreshes the `identityToAgentId` lookup whenever `participant_identity` changes.

- **Dispatch (`model_battleground.agent.dispatch`):**
  ```json
  {
    "agent_name": "battleground-agent-2",
    "metadata": { "display_name": "Agent 2" }
  }
  ```
  The dashboard calls this via `room.localParticipant.performRpc(...)`. The backend worker receives it, calls `LiveKitAPI.agent_dispatch.create_dispatch`, and logs the result. Child workers do **not** register this handler.

### Outstanding issue (handoff for next agent)

- **User transcript routing:** Agent transcripts now appear under the correct cards because of the identity map described above. However, user (local participant) transcripts are still routed heuristically (based on the `lastAgentId` variable). When multiple agents respond in rapid succession, or if the user is conversing with more than one agent simultaneously, the heuristic may attribute user speech to the wrong card. The next step is to add a deterministic signal—e.g., include the controlling agent id in the transcript metadata/rpc payloads or surface the track’s `streamInfo.participantInfo.identity` for the active user turn—so user utterances can be mapped reliably without relying on `lastAgentId`.

Until that fix lands, anyone picking up this work should treat the README’s “Current multi-agent architecture” section as the canonical description of how metrics, dispatch, and transcripts are wired today.

## Coding agents and MCP

This project is designed to work with coding agents like [Cursor](https://www.cursor.com/) and [Claude Code](https://www.anthropic.com/claude-code). 

To get the most out of these tools, install the [LiveKit Docs MCP server](https://docs.livekit.io/mcp).

For Cursor, use this link:

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-light.svg)](https://cursor.com/en-US/install-mcp?name=livekit-docs&config=eyJ1cmwiOiJodHRwczovL2RvY3MubGl2ZWtpdC5pby9tY3AifQ%3D%3D)

For Claude Code, run this command:

```
claude mcp add --transport http livekit-docs https://docs.livekit.io/mcp
```

For Codex CLI, use this command to install the server:
```
codex mcp add --url https://docs.livekit.io/mcp livekit-docs
```

For Gemini CLI, use this command to install the server:
```
gemini mcp add --transport http livekit-docs https://docs.livekit.io/mcp
```

The project includes a complete [AGENTS.md](AGENTS.md) file for these assistants. You can modify this file  your needs. To learn more about this file, see [https://agents.md](https://agents.md).

## Dev Setup

Clone the repository and install dependencies to a virtual environment:

```console
cd agent-starter-python
uv sync
```

Sign up for [LiveKit Cloud](https://cloud.livekit.io/) then set up the environment by copying `.env.example` to `.env.local` and filling in the required keys:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

You can load the LiveKit environment automatically using the [LiveKit CLI](https://docs.livekit.io/home/cli/cli-setup):

```bash
lk cloud auth
lk app env -w -d .env.local
```

## Run the agent

Before your first run, you must download certain models such as [Silero VAD](https://docs.livekit.io/agents/build/turns/vad/) and the [LiveKit turn detector](https://docs.livekit.io/agents/build/turns/turn-detector/):

```console
uv run python src/agent.py download-files
```

Next, run this command to speak to your agent directly in your terminal:

```console
uv run python src/agent.py console
```

To run the agent for use with a frontend or telephony, use the `dev` command:

```console
uv run python src/agent.py dev
```

In production, use the `start` command:

```console
uv run python src/agent.py start
```

## Frontend & Telephony

Get started quickly with our pre-built frontend starter apps, or add telephony support:

| Platform | Link | Description |
|----------|----------|-------------|
| **Web** | [`livekit-examples/agent-starter-react`](https://github.com/livekit-examples/agent-starter-react) | Web voice AI assistant with React & Next.js |
| **iOS/macOS** | [`livekit-examples/agent-starter-swift`](https://github.com/livekit-examples/agent-starter-swift) | Native iOS, macOS, and visionOS voice AI assistant |
| **Flutter** | [`livekit-examples/agent-starter-flutter`](https://github.com/livekit-examples/agent-starter-flutter) | Cross-platform voice AI assistant app |
| **React Native** | [`livekit-examples/voice-assistant-react-native`](https://github.com/livekit-examples/voice-assistant-react-native) | Native mobile app with React Native & Expo |
| **Android** | [`livekit-examples/agent-starter-android`](https://github.com/livekit-examples/agent-starter-android) | Native Android app with Kotlin & Jetpack Compose |
| **Web Embed** | [`livekit-examples/agent-starter-embed`](https://github.com/livekit-examples/agent-starter-embed) | Voice AI widget for any website |
| **Telephony** | [📚 Documentation](https://docs.livekit.io/agents/start/telephony/) | Add inbound or outbound calling to your agent |

For advanced customization, see the [complete frontend guide](https://docs.livekit.io/agents/start/frontend/).

## Tests and evals

This project includes a complete suite of evals, based on the LiveKit Agents [testing & evaluation framework](https://docs.livekit.io/agents/build/testing/). To run them, use `pytest`.

```console
uv run pytest
```

## Using this template repo for your own project

Once you've started your own project based on this repo, you should:

1. **Check in your `uv.lock`**: This file is currently untracked for the template, but you should commit it to your repository for reproducible builds and proper configuration management. (The same applies to `livekit.toml`, if you run your agents in LiveKit Cloud)

2. **Remove the git tracking test**: Delete the "Check files not tracked in git" step from `.github/workflows/tests.yml` since you'll now want this file to be tracked. These are just there for development purposes in the template repo itself.

3. **Add your own repository secrets**: You must [add secrets](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/using-secrets-in-github-actions) for `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` so that the tests can run in CI.

## Deploying to production

This project is production-ready and includes a working `Dockerfile`. To deploy it to LiveKit Cloud or another environment, see the [deploying to production](https://docs.livekit.io/agents/ops/deployment/) guide.

## Self-hosted LiveKit

You can also self-host LiveKit instead of using LiveKit Cloud. See the [self-hosting](https://docs.livekit.io/home/self-hosting/) guide for more information. If you choose to self-host, you'll need to also use [model plugins](https://docs.livekit.io/agents/models/#plugins) instead of LiveKit Inference and will need to remove the [LiveKit Cloud noise cancellation](https://docs.livekit.io/home/cloud/noise-cancellation/) plugin.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
