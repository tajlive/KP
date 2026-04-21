"use client";

import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useMoonshot } from "@/hooks/useMoonshot";

import { TypingMessage, StaticMessage } from "./TypingMessage";
import { AlertTriangle, Bot, Send, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "Hva er forskjellen på Bitcoin og Ethereum?",
  "Hvordan fungerer teknisk analyse?",
  "Hva er RSI-indikatoren?",
  "Forklar blockchain på en enkel måte",
  "Hvilke risikoer er det med krypto?",
];

interface Props {
  context?: string;
  initialMessage?: string;
}

export function MoonshotChat({ context, initialMessage }: Props) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        initialMessage ||
        "Hei! Jeg er Kimi, din AI-assistent for krypto. Spør meg om Bitcoin, trading-strategier, eller risikostyring!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, isLoading, error, clearError } = useMoonshot({
    model: "moonshot-v1-8k",
    temperature: 0.7,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    clearError();

    try {
      // Constructs a "transcript" to simulate history for the stateless Edge Function
      const conversationHistory = newMessages
        .map((m) => `${m.role === "user" ? "User" : "Kimi"}: ${m.content}`)
        .join("\n\n");

      const prompt = context
        ? `CONTEXT:\n${context}\n\nCONVERSATION:\n${conversationHistory}`
        : conversationHistory;

      const response = await sendMessage(prompt);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      // Error is handled by the hook
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="border-b bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <span>Spør Kimi AI</span>
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            Powered by Moonshot AI
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => {
            const isLastAssistant = message.role === 'assistant' && index === messages.length - 1;
            
            // Use typing effect for the last AI message
            if (message.role === 'assistant' && isLastAssistant && messages.length > 1) {
              return (
                <TypingMessage 
                  key={message.id} 
                  content={message.content} 
                  isNew={true}
                />
              );
            }
            
            // Static display for older messages and user messages
            if (message.role === 'assistant') {
              return (
                <StaticMessage 
                  key={message.id} 
                  content={message.content}
                />
              );
            }
            
            // User message
            return (
              <div
                key={message.id}
                className="flex gap-3 flex-row-reverse"
              >
                <Avatar className="w-8 h-8 bg-gray-100">
                  <AvatarFallback>
                    <User className="w-4 h-4 text-gray-600" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm bg-blue-500 text-white">
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 bg-blue-100">
                <AvatarFallback>
                  <Bot className="w-4 h-4 text-blue-600" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
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
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Noe gikk galt: {error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">
              Foreslåtte spørsmål:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-full transition-colors text-left"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t("moonshotPlaceholder")}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            ⚠️ AI-en gir kun utdanningsinformasjon, ikke finansiell rådgivning.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default MoonshotChat;
