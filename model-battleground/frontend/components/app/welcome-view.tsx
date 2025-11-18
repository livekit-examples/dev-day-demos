'use client';

import { Headset } from 'lucide-react';
import { useRoomContext } from '@livekit/components-react';

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  const room = useRoomContext();
  const isConnecting = room.state === 'connecting';
  // Connection details are fetched on-demand when starting the session in useRoom
  const connectionReady = true;

  const disabled = isConnecting || !connectionReady;

  return (
    <div ref={ref} className="flex min-h-screen items-center justify-center bg-bg0 p-6">
      <div className="max-w-md w-full bg-bg1 rounded-xl shadow-sm p-8 border border-separator1">
        <div className="flex flex-col items-center gap-6">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-bgAccent1/20 border border-fgAccent1/30 flex items-center justify-center">
            <Headset className="w-8 h-8 text-fgAccent1" />
          </div>

          {/* Title */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-semibold text-fg0">
              Model Battleground
            </h1>
            <p className="text-sm text-fg3">Voice AI Model Comparison</p>
            <p className="text-xs text-fg4 leading-relaxed mt-2 max-w-sm">
              Compare different agent capabilities including STT, TTS, and LLM speeds in a side-by-side shootout of different models.
            </p>
          </div>

          {/* Local Development Notice */}
          <div className="w-full bg-bgCaution1/20 border border-fgCaution1/30 rounded-lg px-4 py-3">
            <p className="text-xs text-fg2 leading-relaxed text-center">
              <span className="font-semibold text-fgCaution1">
                Local development:
              </span>{' '}
              Make sure to run the Python agent first with{' '}
              <code className="bg-bg2 px-1.5 py-0.5 rounded text-fgAccent1 font-mono">
                python agent.py dev
              </code>
            </p>
          </div>

          {/* Documentation Links */}
          <div className="flex items-center gap-4 text-xs">
            <a
              href="https://docs.livekit.io/agents/start/voice-ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg3 hover:text-fgAccent1 underline transition-colors"
            >
              LiveKit Voice AI Guide
            </a>
            <span className="text-separator2">•</span>
            <a
              href="https://livekit.io/join-slack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg3 hover:text-fgAccent1 underline transition-colors"
            >
              LiveKit Slack
            </a>
          </div>

          {/* Connect Button */}
          <button
            type="button"
            onClick={onStartCall}
            disabled={disabled}
            className="w-full bg-fgAccent1 text-bg0 py-3 px-6 rounded-lg hover:bg-fgAccent2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
          >
            {isConnecting ? 'Connecting…' : startButtonText || 'Connect to Room'}
          </button>

          {/* Connection Status */}
          {!connectionReady && !isConnecting ? (
            <p className="text-fg4 text-xs">Preparing connection details…</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
