"use client";

import { Search, Bell, User } from "lucide-react";
import { motion } from "framer-motion";

export default function Topbar() {
  return (
    <header className="h-20 glass-panel border-b border-white/5 flex items-center justify-between px-8 z-30 sticky top-0 ml-20 md:ml-64 transition-all duration-300">
      
      <div className="flex-1 max-w-xl relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-white/40 group-focus-within:text-amber-400 transition-colors" />
        </div>
        <input 
          type="text" 
          placeholder="Search books, authors, genres (⌘K)" 
          className="w-full bg-black/20 border border-white/10 rounded-full py-2.5 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all backdrop-blur-md"
        />
        {/* Mock typing suggestions hint */}
        <div className="absolute right-4 inset-y-0 flex items-center">
          <kbd className="hidden md:inline-block bg-white/10 text-white/50 text-xs px-2 py-1 rounded-md font-mono">⌘K</kbd>
        </div>
      </div>

      <div className="flex items-center gap-6 ml-4">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 text-white/60 hover:text-white transition-colors"
        >
          <Bell className="w-6 h-6" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0a0e17]"></span>
        </motion.button>
        
        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center border-2 border-white/10 shadow-lg cursor-pointer hover:border-amber-400/50 transition-colors">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>
    </header>
  );
}
