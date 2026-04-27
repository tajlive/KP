"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";
import { MessageCircle, X, Send, TrendingUp, BarChart3, Shield, Wallet, Activity } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  type?: "summary" | "metric" | "comparison" | "unknown";
}

const QUICK_QUESTIONS_NO = [
  { label: "Win rate?", icon: TrendingUp, query: "Hva er min win rate?" },
  { label: "P&L siste uke", icon: BarChart3, query: "Hvordan gikk det forrige uke?" },
  { label: "Risk", icon: Shield, query: "Hva er min max drawdown?" },
  { label: "Balance", icon: Wallet, query: "Hva er min kontobalanse?" },
];

const QUICK_QUESTIONS_EN = [
  { label: "Win rate?", icon: TrendingUp, query: "What's my win rate?" },
  { label: "P&L last week", icon: BarChart3, query: "How did I do last week?" },
  { label: "Risk", icon: Shield, query: "What's my max drawdown?" },
  { label: "Balance", icon: Wallet, query: "What's my account balance?" },
];

export function NLQChat() {
  const locale = useLocale();
  const isNo = locale === "no";
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickQuestions = isNo ? QUICK_QUESTIONS_NO : QUICK_QUESTIONS_EN;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendQuery = async (query: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: query,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/nlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.answer || (isNo ? "Beklager, jeg forstod ikke det." : "Sorry, I didn't understand that."),
        type: data.type,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: isNo
          ? "Beklager, noe gikk galt. Prøv igjen senere."
          : "Sorry, something went wrong. Please try again later.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    void sendQuery(input.trim());
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-colors sm:bottom-8 sm:right-8"
            aria-label={isNo ? "Åpne chat" : "Open chat"}
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 z-50 flex h-[480px] w-[92vw] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:bottom-8 sm:right-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {isNo ? "Trading Assistent" : "Trading Assistant"}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {isNo ? "Spør om dine tall" : "Ask about your numbers"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={isNo ? "Lukk" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 text-center">
                    {isNo
                      ? "Hei! Jeg kan hjelpe deg å forstå trading-dataen din."
                      : "Hi! I can help you understand your trading data."}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {quickQuestions.map((q) => (
                      <button
                        key={q.query}
                        onClick={() => void sendQuery(q.query)}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-slate-700 transition-colors hover:bg-blue-50 hover:border-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <q.icon className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                        <span className="truncate">{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 dark:bg-slate-800">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-gray-200 px-3 py-3 dark:border-slate-700"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isNo ? "Spør om dine tall..." : "Ask about your numbers..."}
                className="flex-1 rounded-xl bg-gray-100 px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
                aria-label={isNo ? "Send" : "Send"}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default NLQChat;
