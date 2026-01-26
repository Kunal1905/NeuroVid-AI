"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Brain,
  Sparkles,
  User,
  MessageSquare,
  Plus,
  Trash2,
  ChevronRight,
  BookOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

/* ----------------------------------
   Types
----------------------------------- */
type Message = {
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  topic: string;
  messages: Message[];
};

/* ----------------------------------
   Component
----------------------------------- */
export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);

  // ⬇️ Sidebar state (mobile only)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /* ----------------------------------
     Helpers
  ----------------------------------- */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [activeConversation?.messages, sending]);

  const createNewConversation = () => {
    const newConvo: Conversation = {
      id: crypto.randomUUID(),
      topic: "New Conversation",
      messages: [
        {
          role: "assistant",
          content:
            "Hello! 👋 I'm your AI learning assistant. What would you like to learn today?",
        },
      ],
    };

    setConversations((prev) => [newConvo, ...prev]);
    setActiveConversation(newConvo);
    setSidebarOpen(false); // 👈 close sidebar on mobile
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversation?.id === id) {
      setActiveConversation(null);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !activeConversation) return;

    const userMessage: Message = {
      role: "user",
      content: inputMessage.trim(),
    };

    setInputMessage("");
    setSending(true);

    const updatedConversation = {
      ...activeConversation,
      messages: [...activeConversation.messages, userMessage],
    };

    setActiveConversation(updatedConversation);
    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConversation.id ? updatedConversation : c))
    );

    setTimeout(() => {
      const assistantMessage: Message = {
        role: "assistant",
        content: `That's a great question! 🤓  

Here’s a clear explanation to help you understand it better.

If you want, we can go **deeper**, **simpler**, or look at **real-world examples** next.`,
      };

      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, assistantMessage],
      };

      setActiveConversation(finalConversation);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === finalConversation.id ? finalConversation : c
        )
      );
      setSending(false);
    }, 900);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ----------------------------------
     Render
  ----------------------------------- */
  return (
    <div className="h-screen bg-[#0B0B1A] text-white relative overflow-hidden">
      <div className="flex h-full">
        {/* ------------------------------
            MOBILE BACKDROP
        ------------------------------ */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}

        {/* ------------------------------
            SIDEBAR
        ------------------------------ */}
        <div
          className={cn(
            "fixed top-16 z-50 h-[calc(100vh-4rem)] w-80 flex flex-col bg-[#0B0B1A] border-r border-white/10 transition-transform duration-300 shadow-[20px_0_60px_-20px_rgba(0,0,0,0.8)]",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            "lg:translate-x-0"
          )}
        >
          <div className="p-4 border-b border-white/10 pt-4">
            <Button
              onClick={createNewConversation}
              className="w-full bg-gradient-to-r from-violet-600 to-blue-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <MessageSquare className="w-10 h-10 mx-auto mb-3" />
                No conversations yet
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveConversation(c);
                      setSidebarOpen(false); // 👈 auto close on mobile
                    }}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition",
                      activeConversation?.id === c.id
                        ? "bg-violet-500/20"
                        : "hover:bg-white/5"
                    )}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="flex-1 truncate text-sm">{c.topic}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------
            MAIN CHAT
        ------------------------------ */}
        <div className="flex-1 flex flex-col pt-16 lg:pt-0">
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
                <h2 className="font-semibold">
                  {activeConversation.topic}
                </h2>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {activeConversation.messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-3",
                        m.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      {m.role === "assistant" && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] p-4 rounded-2xl",
                          m.role === "user"
                            ? "bg-violet-500/20"
                            : "bg-white/5"
                        )}
                      >
                        {m.role === "assistant" ? (
                          <ReactMarkdown>
                            {m.content}
                          </ReactMarkdown>
                        ) : (
                          m.content
                        )}
                      </div>
                      {m.role === "user" && (
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {sending && (
                  <div className="flex gap-3 items-center text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                    Thinking...
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10 flex gap-3">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask something..."
                  className="bg-white/5 border-white/10 text-white resize-none"
                />
                <Button
                  onClick={sendMessage}
                  disabled={sending || !inputMessage.trim()}
                  className="bg-gradient-to-r from-violet-600 to-blue-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Brain className="w-16 h-16 text-violet-400 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">
                AI Learning Assistant
              </h2>
              <p className="text-slate-400 max-w-md mb-6">
                Start a new conversation to begin learning.
              </p>
              <Button
                onClick={createNewConversation}
                className="bg-gradient-to-r from-violet-600 to-blue-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
