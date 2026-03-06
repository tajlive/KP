"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Sparkles, Loader2, RefreshCw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  provider?: string;
}

interface AIChatProps {
  className?: string;
  useCase?: "crypto" | "trading" | "market" | "general";
  placeholder?: string;
  showProviderBadge?: boolean;
}

export function AIChat({
  className,
  useCase = "crypto",
  placeholder = "Spør Krypto-Professoren...",
  showProviderBadge = true,
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hei! Jeg er din Krypto-Professor. Hva kan jeg hjelpe deg med i dag?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textareaRef = useRef<any>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check which provider is active
  useEffect(() => {
    fetch("/api/chat")
      .then((res) => res.json())
      .then((data) => {
        setActiveProvider(data.activeProvider);
      })
      .catch(() => {
        setActiveProvider(null);
      });
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }].map(
            (m) => ({ role: m.role, content: m.content })
          ),
          useCase,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content,
          citations: data.citations,
          provider: data.provider,
        },
      ]);

      // Update active provider
      if (data.provider) {
        setActiveProvider(data.provider);
      }
    } catch (_error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Beklager, jeg kunne ikke behandle forespørselen din. Vennligst prøv igjen.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hei! Jeg er din Krypto-Professor. Hva kan jeg hjelpe deg med i dag?",
      },
    ]);
  };

  const getProviderLabel = (provider?: string) => {
    switch (provider) {
      case "perplexity":
        return "Perplexity PRO";
      case "kimi":
        return "KIMI";
      case "nvidia":
        return "NVIDIA";
      default:
        return "AI";
    }
  };

  const getProviderColor = (provider?: string) => {
    switch (provider) {
      case "perplexity":
        return "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300";
      case "kimi":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "nvidia":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-[600px] bg-white dark:bg-gray-900 rounded-lg border shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 dark:bg-gray-800 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
            <Bot className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Krypto-Professoren
            </h3>
            {showProviderBadge && activeProvider && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  getProviderColor(activeProvider)
                )}
              >
                {getProviderLabel(activeProvider)}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          className="text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Ny chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                message.role === "user"
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              )}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.citations && message.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Kilder:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {message.citations.slice(0, 3).map((citation, i) => (
                      <a
                        key={i}
                        href={citation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-600 dark:text-teal-400 hover:underline truncate max-w-[150px]"
                      >
                        [{i + 1}] {new URL(citation).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
              <Bot className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Tenker...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-800 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[44px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-auto px-4"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-2 text-center">
          AI-en kan gjøre feil. Bekreft viktig informasjon. Ikke finansiell rådgivning.
        </p>
      </div>
    </div>
  );
}

// Export a simpler version for inline use
export function AIChatInline({ className }: { className?: string }) {
  return <AIChat className={className} useCase="general" />;
}
