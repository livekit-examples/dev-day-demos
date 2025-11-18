'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { type AgentState, useRoomContext, useVoiceAssistant } from '@livekit/components-react';
import { Headset } from 'lucide-react';
import { toastAlert } from '@/components/alert-toast';
import {
  AgentControlBar,
  type AgentControlBarProps,
} from '@/components/livekit/agent-control-bar/agent-control-bar';
import type { CheckoutState, OrderState } from '@/components/order-status';
import { OrderStatus } from '@/components/order-status';
import { cn } from '@/lib/utils';

function isAgentAvailable(agentState: AgentState) {
  return agentState == 'listening' || agentState == 'thinking' || agentState == 'speaking';
}

interface SessionViewProps {
  sessionStarted: boolean;
  onStartSession: () => void;
  isConnecting: boolean;
  connectionReady: boolean;
}

interface ConnectScreenProps {
  onStartSession: () => void;
  isConnecting: boolean;
  connectionReady: boolean;
}

function ConnectScreen({ onStartSession, isConnecting, connectionReady }: ConnectScreenProps) {
  const disabled = isConnecting || !connectionReady;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg0 p-6">
      <div className="max-w-md w-full bg-bg1 rounded-xl shadow-sm p-8 border border-separator1">
        <div className="flex flex-col items-center gap-6">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-bgAccent1/20 border border-fgAccent1/30 flex items-center justify-center">
            <Headset className="w-8 h-8 text-fgAccent1" />
          </div>

          {/* Title */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-semibold text-fg0">
              Voice Drive-Thru Agent
            </h1>
            <p className="text-sm text-fg3">Voice AI Drive-Thru Assistant</p>
            <p className="text-xs text-fg4 leading-relaxed mt-2 max-w-sm">
              Connect to the LiveKit room to start handling orders with real-time status updates,
              menu callouts, and mic controls.
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
            onClick={onStartSession}
            disabled={disabled}
            className="w-full bg-fgAccent1 text-bg0 py-3 px-6 rounded-lg hover:bg-fgAccent2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
          >
            {isConnecting ? 'Connecting…' : 'Connect to Room'}
          </button>

          {/* Connection Status */}
          {!connectionReady && !isConnecting ? (
            <p className="text-fg4 text-xs">Preparing connection details…</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const MONEY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export const SessionView = ({
  sessionStarted,
  onStartSession,
  isConnecting,
  connectionReady,
  ...props
}: React.ComponentProps<'main'> & SessionViewProps) => {
  const { state: agentState } = useVoiceAssistant();
  const room = useRoomContext();
  const { className, ...rest } = props;
  const [orderStateSnapshot, setOrderStateSnapshot] = useState<OrderState | null>(null);
  const [checkoutStateSnapshot, setCheckoutStateSnapshot] = useState<CheckoutState | null>(null);
  const [controlBarHeight, setControlBarHeight] = useState(0);
  const [runningTotalHeight, setRunningTotalHeight] = useState(0);
  const controlBarRef = useRef<HTMLDivElement | null>(null);
  const runningTotalRef = useRef<HTMLDivElement | null>(null);
  const showRunningTotal =
    sessionStarted &&
    orderStateSnapshot !== null &&
    orderStateSnapshot.item_count > 0 &&
    !checkoutStateSnapshot;
  const formattedTotal = orderStateSnapshot
    ? MONEY_FORMATTER.format(orderStateSnapshot.total_price)
    : '';
  const reservedBottomSpace =
    sessionStarted && (controlBarHeight > 0 || runningTotalHeight > 0)
      ? controlBarHeight + (showRunningTotal ? runningTotalHeight : 0)
      : 0;
  const contentPaddingBottom =
    reservedBottomSpace > 0 ? reservedBottomSpace + 32 /* breathing room */ : 0;
  const contentMinHeight =
    sessionStarted && reservedBottomSpace > 0
      ? `calc(100vh - ${reservedBottomSpace}px)`
      : undefined;
  const contentWrapperStyle =
    contentPaddingBottom > 0 || contentMinHeight
      ? {
          ...(contentPaddingBottom > 0 ? { paddingBottom: `${contentPaddingBottom}px` } : null),
          ...(contentMinHeight ? { minHeight: contentMinHeight } : null),
        }
      : undefined;
  const handleOrderStateChange = useCallback(
    (order: OrderState | null, checkout: CheckoutState | null) => {
      setOrderStateSnapshot(order);
      setCheckoutStateSnapshot(checkout);
    },
    []
  );

  useEffect(() => {
    if (sessionStarted) {
      const timeout = setTimeout(() => {
        if (!isAgentAvailable(agentState)) {
          const reason =
            agentState === 'connecting'
              ? 'Agent did not join the room. '
              : 'Agent connected but did not complete initializing. ';

          toastAlert({
            title: 'Session ended',
            description: (
              <p className="w-full">
                {reason}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://docs.livekit.io/agents/start/voice-ai/"
                  className="whitespace-nowrap underline"
                >
                  See quickstart guide
                </a>
                .
              </p>
            ),
          });
          room.disconnect();
        }
      }, 10_000);

      return () => clearTimeout(timeout);
    }
  }, [agentState, sessionStarted, room]);

  useEffect(() => {
    if (!sessionStarted) {
      setControlBarHeight(0);
      setRunningTotalHeight(0);
      return;
    }

    const recalcHeights = () => {
      setControlBarHeight(controlBarRef.current?.offsetHeight ?? 0);
      setRunningTotalHeight(
        showRunningTotal && runningTotalRef.current ? runningTotalRef.current.offsetHeight : 0
      );
    };

    const frame = requestAnimationFrame(recalcHeights);
    window.addEventListener('resize', recalcHeights);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', recalcHeights);
    };
  }, [
    sessionStarted,
    showRunningTotal,
    orderStateSnapshot?.item_count,
    checkoutStateSnapshot?.message,
  ]);

  if (!sessionStarted) {
    return (
      <main className={cn('bg-background', className)} {...rest}>
        <ConnectScreen
          onStartSession={onStartSession}
          isConnecting={isConnecting}
          connectionReady={connectionReady}
        />
      </main>
    );
  }

  return (
    <main className={cn('bg-background', className)} {...rest}>
      <div className="flex flex-col bg-background" style={contentWrapperStyle}>
        <OrderStatus
          className="min-h-full"
          showFooter={false}
          onStateChange={handleOrderStateChange}
        />
      </div>

      {sessionStarted ? (
        <>
          <div
            ref={runningTotalRef}
            style={{ bottom: `${controlBarHeight}px` }}
            className={cn(
              'fixed inset-x-0 flex justify-center px-4 transition-opacity duration-200',
              showRunningTotal ? 'z-40 opacity-100' : 'pointer-events-none opacity-0'
            )}
          >
            {showRunningTotal ? (
              <div className="border-separator1 bg-bg1/95 mx-auto flex w-full max-w-5xl items-center justify-between rounded-t-2xl border border-b-0 px-6 py-5 shadow-[0_-8px_16px_-14px_rgba(0,0,0,0.4)]">
                <div className="text-fg3 text-sm font-medium">Running total</div>
                <div className="text-fg0 text-2xl font-semibold">{formattedTotal}</div>
              </div>
            ) : null}
          </div>

          <section
            ref={controlBarRef}
            className="border-separator1 bg-bg1 fixed inset-x-0 bottom-0 z-50 border-t px-4 py-6 shadow-[0_-12px_20px_-18px_rgba(0,0,0,0.35)]"
          >
            <AgentControlBar
              controls={{
                microphone: true,
                leave: true,
                camera: false,
                chat: false,
                screenShare: false,
              }}
              capabilities={
                {
                  supportsChatInput: false,
                  supportsVideoInput: false,
                  supportsScreenShare: false,
                } satisfies AgentControlBarProps['capabilities']
              }
              onChatOpenChange={() => {}}
              onSendMessage={async () => {}}
              className="mx-auto w-full max-w-xl"
            />
          </section>
        </>
      ) : null}
    </main>
  );
};
