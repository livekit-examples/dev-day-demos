'use client';

import { MetricBar } from './metric-bar';
import { AgentChatArea } from './agent-chat-area';
import { cn } from '@/lib/utils';

export interface AgentMetricDatum {
  label: string;
  value: number;
  latencyMs: number;
}

export interface AgentMetrics {
  stt: AgentMetricDatum;
  llm: AgentMetricDatum;
  tts: AgentMetricDatum;
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
}

interface AgentCardProps {
  agentName: string;
  metrics: AgentMetrics;
  messages?: ChatMessage[];
  isDispatched: boolean;
  isDispatching?: boolean;
  isHighlighted?: boolean;
  onDispatch?: () => void;
  onHover?: () => void;
  className?: string;
}

export function AgentCard({
  agentName,
  metrics,
  messages = [],
  isDispatched,
  isDispatching = false,
  isHighlighted = false,
  onDispatch,
  onHover,
  className,
}: AgentCardProps) {
  const formatLatency = (latencyMs: number) => {
    if (!Number.isFinite(latencyMs)) {
      return '—';
    }
    return `${Math.round(latencyMs)}ms`;
  };

  const totalLatencyMs =
    (metrics.stt.latencyMs ?? 0) + (metrics.llm.latencyMs ?? 0) + (metrics.tts.latencyMs ?? 0);

  return (
    <div
      onMouseEnter={onHover}
      className={cn(
        'flex flex-col gap-6 p-6 bg-bg1 rounded-xl border border-separator1 h-full min-h-0 transition-shadow duration-200 hover:border-[#1ED5F9] hover:shadow-[0_0_25px_rgba(30,213,249,0.35)]',
        isHighlighted && 'border-[#1ED5F9] shadow-[0_0_25px_rgba(30,213,249,0.35)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              isDispatched ? 'bg-green-500' : 'bg-red-500',
            )}
            aria-label={isDispatched ? 'Agent dispatched' : 'Agent not dispatched'}
          />
          <h3 className="text-fg0 text-xl font-bold">{agentName}</h3>
          <span className="text-[#1ED5F9] font-mono text-sm">{formatLatency(totalLatencyMs)}</span>
        </div>
        {!isDispatched && onDispatch && (
          <div className="flex items-center min-h-[34px]">
            {isDispatching ? (
              <span
                className="text-sm text-fg3 bg-white/5 px-4 py-1.5 rounded-md border border-white/10"
                aria-live="polite"
              >
                Dispatching…
              </span>
            ) : (
              <button
                type="button"
                onClick={onDispatch}
                className="bg-white/10 hover:bg-white/20 text-fg0 text-sm font-medium py-1.5 px-4 rounded-md transition-colors"
              >
                Dispatch Agent
              </button>
            )}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="flex-shrink-0 space-y-4">
        <MetricBar label={metrics.stt.label} value={metrics.stt.value} latencyMs={metrics.stt.latencyMs} />
        <MetricBar label={metrics.llm.label} value={metrics.llm.value} latencyMs={metrics.llm.latencyMs} />
        <MetricBar label={metrics.tts.label} value={metrics.tts.value} latencyMs={metrics.tts.latencyMs} />
      </div>

      {/* Chat Area - scrollable */}
      <div className="mt-auto pt-6 border-t border-separator1 flex flex-col min-h-0 flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <AgentChatArea messages={messages} />
        </div>
      </div>
    </div>
  );
}
