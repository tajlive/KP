'use client';

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTypingEffect, cleanCitations } from "@/hooks/useTypingEffect";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypingMessageProps {
  content: string;
  isNew?: boolean;
}

export function TypingMessage({ content, isNew = true }: TypingMessageProps) {
  // Clean citations from content
  const cleanContent = cleanCitations(content);

  const { displayedText, isTyping, isDelayed } = useTypingEffect({
    text: cleanContent,
    speed: 20, // 20ms per character (natural speed)
    delay: 600, // 600ms delay before starting
    enabled: isNew, // Only animate new messages
  });

  return (
    <div className="flex gap-3">
      <Avatar className="w-8 h-8 bg-blue-100">
        <AvatarFallback>
          <Bot className="w-4 h-4 text-blue-600" />
        </AvatarFallback>
      </Avatar>

      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 max-w-[80%]">
        {/* Show typing indicator during delay */}
        {isDelayed && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-xs">Skriver...</span>
          </div>
        )}

        {/* Show typing text */}
        {!isDelayed && (
          <div className="text-sm text-foreground whitespace-pre-wrap">
            {displayedText}
            {isTyping && (
              <span className="inline-block w-0.5 h-4 bg-blue-600 ml-0.5 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Static message (for already displayed messages)
export function StaticMessage({ content }: { content: string }) {
  const cleanContent = cleanCitations(content);

  return (
    <div className="flex gap-3">
      <Avatar className="w-8 h-8 bg-blue-100">
        <AvatarFallback>
          <Bot className="w-4 h-4 text-blue-600" />
        </AvatarFallback>
      </Avatar>

      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 max-w-[80%] text-sm text-foreground whitespace-pre-wrap">
        {cleanContent}
      </div>
    </div>
  );
}
