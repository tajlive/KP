"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  startTransition,
  memo,
} from "react";
import {
  MessageCircle,
  X,
  Send,
  GraduationCap,
  Minimize2,
  Sparkles,
  User,
  Bot,
  Loader2,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/error";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
}

// Typing delay konfigurasjon
const TYPING_CONFIG = {
  minDelay: 15, // Minimum ms mellom tegn
  maxDelay: 45, // Maximum ms mellom tegn
  batchSize: 3, // Antall tegn som vises samtidig
  pauseChars: [".", "!", "?", ","], // Tegn som gir pause
  pauseDelay: 150, // Ekstra pause etter punktum/komma
};

function ChatWidgetInner() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom when messages change (auto = mindre hovedtråd-arbeid enn smooth → bedre INP)
  useEffect(() => {
    if (!isOpen || !scrollRef.current) return;
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
      }
    });
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Simulate typing effect
  const simulateTyping = useCallback(
    async (messageId: string, fullContent: string) => {
      setTypingMessageId(messageId);
      let currentIndex = 0;

      const typeNextBatch = () => {
        if (currentIndex >= fullContent.length) {
          setTypingMessageId(null);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, isTyping: false } : m,
            ),
          );
          return;
        }

        const batchEnd = Math.min(
          currentIndex + TYPING_CONFIG.batchSize,
          fullContent.length,
        );
        const newContent = fullContent.slice(0, batchEnd);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, content: newContent } : m,
          ),
        );

        currentIndex = batchEnd;

        // Calculate delay for next batch
        const lastChar = fullContent[currentIndex - 1];
        const isPauseChar = TYPING_CONFIG.pauseChars.includes(lastChar);
        const delay = isPauseChar
          ? TYPING_CONFIG.pauseDelay
          : Math.random() * (TYPING_CONFIG.maxDelay - TYPING_CONFIG.minDelay) +
            TYPING_CONFIG.minDelay;

        setTimeout(typeNextBatch, delay);
      };

      // Start typing after a small initial delay (thinking time)
      setTimeout(typeNextBatch, 400);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!(input || "").trim() || isLoading) return;

      const userMessage = (input || "").trim();
      setInput("");
      setIsLoading(true);
      setError(null);

      // Cancel any ongoing typing
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Add user message
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`,
          );
        }

        // Read the SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        const assistantId = (Date.now() + 1).toString();

        // Add placeholder for assistant message (hidden initially)
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            isTyping: true,
          },
        ]);

        if (reader) {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process SSE lines
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = (line || "").trim();
              if (trimmed.startsWith("data: ")) {
                const data = trimmed.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullContent += content;
                  }
                } catch (e) {
                  // Ignore parse errors for non-JSON lines
                }
              }
            }
          }
        }

        // Now start the typing effect with the full content
        if (fullContent) {
          simulateTyping(assistantId, fullContent);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Chat error:", err);
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, simulateTyping],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleOpen = useCallback(() => {
    startTransition(() => {
      setIsOpen((o) => !o);
    });
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 font-sans [contain:layout]">
      {/* Kun når åpen: unngår ~600px+ DOM + layout når lukket (INP / Professor Kimi) */}
      {isOpen ? (
        <div
          className={cn(
            "origin-bottom-right transition-all duration-300 ease-out",
            "opacity-100 scale-100 translate-y-0",
          )}
        >
          <div className="w-[380px] sm:w-[420px] h-[650px] max-h-[80vh] bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5 relative">
            {/* Decorative Background Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Header */}
            <div className="relative bg-slate-900/60 backdrop-blur-md p-4 border-b border-white/5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className="absolute inset-0 bg-linear-to-tr from-brand-500 to-brand-600 rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="relative p-2.5 bg-slate-900 rounded-xl ring-1 ring-white/10">
                    <GraduationCap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-white text-sm tracking-wide flex items-center gap-2">
                    Professor Kimi
                    <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Online • Klarpakke AI
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => startTransition(() => setIsOpen(false))}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-95"
                aria-label="Minimer chat"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20 transition-colors"
              ref={scrollRef}
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-4 py-8 animate-in fade-in zoom-in-95 duration-500">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-full h-full bg-slate-800/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                      <Sparkles className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                  <div className="space-y-2 max-w-[280px]">
                    <h4 className="text-white font-semibold text-lg">
                      Hei! Jeg er Professor Kimi 👋
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Din AI-mentor ved Klarpakke Universitet. Spør meg om{" "}
                      <span className="text-blue-400 font-medium">krypto</span>,{" "}
                      <span className="text-emerald-400 font-medium">
                        trading
                      </span>
                      , eller{" "}
                      <span className="text-purple-400 font-medium">
                        kurset
                      </span>
                      !
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 w-full max-w-[260px]">
                    {[
                      "Hva er Bitcoin?",
                      "Forklar RSI indikator",
                      "Hvordan kjøpe krypto?",
                    ].map((q) => (
                      <button
                        type="button"
                        key={q}
                        onClick={() => setInput(q)}
                        className="text-xs text-slate-300 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 py-2.5 px-4 rounded-xl transition-all text-left w-full truncate"
                      >
                        Trykk: "{q}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex gap-3 max-w-[90%]",
                    m.role === "user" ? "ml-auto flex-row-reverse" : "",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg border border-white/5",
                      m.role === "user"
                        ? "bg-linear-to-br from-blue-600 to-indigo-600"
                        : "bg-slate-800",
                    )}
                  >
                    {m.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-blue-400" />
                    )}
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        {m.role === "user" ? "Du" : "Professor"}
                      </span>
                      {m.isTyping && (
                        <span className="text-[10px] text-blue-400 animate-pulse">
                          skriver...
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-md backdrop-blur-sm transition-all duration-200",
                        m.role === "user"
                          ? "bg-linear-to-br from-blue-600/90 to-indigo-600/90 text-white rounded-tr-sm border border-white/10"
                          : "bg-slate-800/40 text-slate-200 rounded-tl-sm border border-white/5 hover:bg-slate-800/60",
                      )}
                    >
                      {m.content ||
                        (m.isTyping && (
                          <span className="inline-flex gap-1">
                            <span
                              className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && !typingMessageId && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-white/5">
                    <Bot className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="bg-slate-800/40 rounded-2xl rounded-tl-sm px-5 py-4 border border-white/5 flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 mr-2">Tenker</span>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              {error && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-800 flex items-center justify-center shrink-0 border border-red-700">
                    <Bot className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="bg-red-900/40 rounded-2xl rounded-tl-sm px-5 py-3 border border-red-700/50 text-red-200 text-sm">
                    Beklager, det oppstod en feil: {error}
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900/40 backdrop-blur-md border-t border-white/5 z-10">
              <form
                onSubmit={handleSubmit}
                className="relative flex items-end gap-2"
              >
                <div className="relative flex-1 group">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Skriv et spørsmål..."
                    disabled={isLoading}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-4 py-6 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 rounded-2xl transition-all shadow-inner focus:bg-slate-900/90 h-auto"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                </div>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!(input || "").trim() || isLoading}
                  className={cn(
                    "h-[52px] w-[52px] rounded-2xl shadow-lg transition-all duration-300",
                    (input || "").trim() && !isLoading
                      ? "bg-linear-to-br from-blue-600 to-indigo-600 hover:shadow-blue-500/25 hover:scale-105 active:scale-95 text-white"
                      : "bg-slate-800 text-slate-500 hover:bg-slate-700",
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 ml-0.5" />
                  )}
                </Button>
              </form>
              <div className="text-center mt-2">
                <p className="text-[10px] text-slate-600 font-medium">
                  Drevet av{" "}
                  <span className="text-slate-500">Perplexity AI</span> •
                  Student-modus
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Floating Toggle Button — tooltip via CSS (unngår setState på hover = INP) */}
      <button
        type="button"
        onClick={toggleOpen}
        className="group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-full"
      >
        {/* Ping Animation */}
        {!isOpen && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 animate-ping duration-1000 delay-1000" />
        )}

        {/* Glow Effect */}
        <div
          className={cn(
            "absolute inset-0 bg-blue-500 rounded-full blur-xl transition-all duration-500",
            isOpen
              ? "opacity-0 scale-50"
              : "opacity-40 group-hover:opacity-70 group-hover:scale-110",
          )}
        />

        {/* Main Button */}
        <div
          className={cn(
            "relative flex items-center justify-center w-16 h-16 rounded-full shadow-2xl border border-white/10 transition-all duration-500 ease-out transform",
            isOpen
              ? "bg-slate-900 rotate-90 scale-90"
              : "bg-linear-to-br from-blue-600 to-indigo-600 hover:scale-110 hover:rotate-6",
          )}
        >
          {isOpen ? (
            <X className="w-7 h-7 text-white" />
          ) : (
            <MessageCircle className="w-7 h-7 text-white" />
          )}
        </div>

        {/* Tooltip: group-hover, ikke React state */}
        <div
          className={cn(
            "absolute right-full mr-4 top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none",
            "bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg",
            "border border-white/10 shadow-lg transition-all duration-300",
            "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
            isOpen && "hidden",
          )}
        >
          Spør Professor Kimi
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-t border-white/10" />
        </div>
      </button>
    </div>
  );
}

export const ChatWidget = memo(ChatWidgetInner);
