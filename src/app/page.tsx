"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ScanBarcode, Sparkles, BookOpen, Layers, Library } from "lucide-react";

const bookThoughts = [
  { quote: "A reader lives a thousand lives before he dies.", author: "George R.R. Martin" },
  { quote: "Books are a uniquely portable magic.", author: "Stephen King" },
  { quote: "One glance at a book and you hear the voice of another person.", author: "Carl Sagan" },
  { quote: "A room without books is like a body without a soul.", author: "Marcus Tullius Cicero" },
  { quote: "The world belongs to those who read.", author: "Rick Holland" },
  { quote: "Reading is dreaming with open eyes.", author: "Anissa Trisdianty" },
  { quote: "Books are mirrors: you only see in them what you already have inside you.", author: "Carlos Ruiz Zafón" },
  { quote: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { quote: "Today a reader, tomorrow a leader.", author: "Margaret Fuller" },
  { quote: "A book is a dream that you hold in your hand.", author: "Neil Gaiman" },
  { quote: "We read to know we are not alone.", author: "C.S. Lewis" },
  { quote: "Think before you speak. Read before you think.", author: "Fran Lebowitz" },
  { quote: "That's the thing about books. They let you travel without moving your feet.", author: "Jhumpa Lahiri" },
  { quote: "Reading gives us someplace to go when we have to stay where we are.", author: "Mason Cooley" },
  { quote: "I have always imagined that Paradise will be a kind of library.", author: "Jorge Luis Borges" },
];

export default function LandingPage() {
  const thought = useMemo(() => bookThoughts[Math.floor(Math.random() * bookThoughts.length)], []);

  return (
    <div className="relative min-h-screen bg-[#0a0e17] overflow-hidden flex flex-col items-center justify-center">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[1200px] opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />

      {/* Floating Elements (Bookshelf simulation) */}
      <motion.div 
        animate={{ y: [0, -20, 0], rotate: [0, 2, 0] }} 
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-[15%] w-24 h-32 glass-card rounded-md border-l-4 border-l-amber-500 shadow-2xl hidden md:block"
      />
      <motion.div 
        animate={{ y: [0, 30, 0], rotate: [0, -5, 0] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 right-[15%] w-32 h-40 glass-card rounded-md border-l-4 border-l-emerald-500 shadow-2xl hidden md:block"
      />
      <motion.div 
        animate={{ y: [0, -15, 0], rotate: [0, 8, 0] }} 
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-1/3 right-[20%] w-20 h-28 glass-card rounded-md border-l-4 border-l-indigo-500 shadow-2xl hidden lg:block"
      />

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto flex flex-col items-center">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-20 h-20 mb-8 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.4)]"
        >
          <BookOpen className="w-10 h-10 text-white" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-outfit text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 mb-4 leading-tight"
        >
          &ldquo;{thought.quote}&rdquo;
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-amber-400/80 font-medium mb-3 italic"
        >
          — {thought.author}
        </motion.p>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-base md:text-lg text-white/40 max-w-2xl mb-12"
        >
          Your AI-powered personal library. Scan, organize, and discover.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
        >
          <Link href="/scanner">
            <button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-full font-medium flex items-center justify-center gap-3 transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] transform hover:-translate-y-1">
              <ScanBarcode className="w-5 h-5" />
              Scan My First Book
            </button>
          </Link>

          <Link href="/library">
            <button className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-amber-500/30 rounded-full font-medium flex items-center justify-center gap-3 transition-all backdrop-blur-md transform hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Library className="w-5 h-5 text-amber-400" />
              My Library
            </button>
          </Link>
          
          <Link href="/dashboard">
            <button className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-full font-medium flex items-center justify-center gap-3 transition-all backdrop-blur-md transform hover:-translate-y-1">
              <Layers className="w-5 h-5 text-emerald-400" />
              Explore Demo
            </button>
          </Link>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-20 flex items-center gap-2 text-white/40 text-sm font-medium"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          POWERED BY BOOKMIND AI
        </motion.div>

      </div>
    </div>
  );
}
