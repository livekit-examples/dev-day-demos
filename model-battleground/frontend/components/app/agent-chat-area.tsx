'use client';

import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
}

interface AgentChatAreaProps {
  messages?: ChatMessage[];
  className?: string;
}

export function AgentChatArea({ messages = [], className }: AgentChatAreaProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {messages.length === 0 ? (
        <div className="text-fg4 text-sm text-center py-8">No messages yet</div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'rounded-lg px-4 py-2 max-w-[80%]',
              message.isUser
                ? 'self-end bg-fgAccent1 text-bg0 rounded-br-none'
                : 'self-start bg-bg2 text-fg0 rounded-bl-none'
            )}
          >
            <p className="text-sm">{message.text}</p>
          </div>
        ))
      )}
    </div>
  );
}

