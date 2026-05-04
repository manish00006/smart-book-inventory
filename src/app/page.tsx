"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ScanBarcode, Sparkles, BookOpen, Layers, Library } from "lucide-react";

export default function LandingPage() {
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
          className="font-outfit text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 mb-6"
        >
          Never Buy the Same <br className="hidden md:block" /> Book Twice Again.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-white/60 max-w-2xl mb-12"
        >
          AI-powered personal library inventory system for collectors and readers. Scan, organize, and discover like never before.
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
