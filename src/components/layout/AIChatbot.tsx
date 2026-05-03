"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareText, X, Sparkles, Send, User } from "lucide-react";
import { useChat } from "@ai-sdk/react";

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ parts: [{ type: 'text', text: input }], role: 'user' });
    setInput("");
  };

  const suggestedPrompts = [
    "Do I already own Sapiens?",
    "Recommend a sci-fi book.",
    "Which books are unread?"
  ];

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-[350px] h-[500px] glass-card rounded-2xl flex flex-col overflow-hidden z-50 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-outfit font-semibold text-white">BookMind AI</h3>
                  <p className="text-xs text-emerald-400 font-medium">Online • Library Assistant</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
              <div className="bg-white/5 rounded-2xl rounded-tl-sm p-3 max-w-[85%] border border-white/5 text-sm text-white/90 self-start">
                Hello! I am your personal library assistant. How can I help you manage your collection today?
              </div>
              
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  className={`flex flex-col gap-1 max-w-[85%] ${m.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  <div className={`p-3 text-sm rounded-2xl ${
                    m.role === 'user' 
                      ? 'bg-amber-500/20 border border-amber-500/30 text-white rounded-tr-sm' 
                      : 'bg-white/5 border border-white/5 text-white/90 rounded-tl-sm'
                  }`}>
                    {m.parts?.filter(p => p.type === 'text').map((p, i) => (
                      <span key={i}>{'text' in p ? p.text : ''}</span>
                    ))}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="bg-white/5 rounded-2xl rounded-tl-sm p-3 max-w-[85%] border border-white/5 text-sm text-white/50 self-start animate-pulse">
                  BookMind AI is typing...
                </div>
              )}
              
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-2xl rounded-tl-sm p-3 max-w-[85%] text-sm text-red-200 self-start">
                  {error.message || "An error occurred communicating with the AI. Please check your API keys."}
                </div>
              )}
              
              <div ref={messagesEndRef} />

              {messages.length === 0 && (
                <div className="mt-auto space-y-2">
                  {suggestedPrompts.map((prompt, i) => (
                    <button 
                      key={i}
                      className="block w-full text-left px-3 py-2 text-xs text-amber-300/80 hover:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 rounded-lg border border-amber-500/10 transition-colors"
                      onClick={() => {
                        setInput(prompt);
                        // Using a small timeout to allow state to update before submit
                        setTimeout(() => {
                          const form = document.getElementById("ai-chat-form") as HTMLFormElement;
                          form?.requestSubmit();
                        }, 50);
                      }}
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/10 bg-black/20">
              <form id="ai-chat-form" onSubmit={handleSubmit} className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask anything..." 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!input || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] z-50 text-white hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquareText className="w-6 h-6" />}
      </motion.button>
    </>
  );
}
