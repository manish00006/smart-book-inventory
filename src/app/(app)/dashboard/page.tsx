"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  BookCheck, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  ChevronRight, 
  Loader2,
  Target
} from "lucide-react";
import { getLibraryStats, getRecentBooks, Book } from "@/lib/bookService";
import { getProfile, Profile } from "@/lib/profileService";

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDbPaused, setIsDbPaused] = useState(false);
  const [hideOfflineBanner, setHideOfflineBanner] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [libraryStats, setLibraryStats] = useState({
    totalBooks: 0,
    booksRead: 0,
    duplicateAlerts: 0,
    readingTimeHours: 0,
  });
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    setIsDbPaused(false);
    try {
      // Load profile first (it has local/mock fallback if needed)
      const prof = await getProfile().catch(() => null);
      if (prof) setProfile(prof);

      const [stats, books] = await Promise.all([
        getLibraryStats(),
        getRecentBooks(4)
      ]);
      setLibraryStats(stats);
      setRecentBooks(books);
    } catch (err: any) {
      console.error("Failed to load dashboard data:", err);
      setError(err.message || "Failed to load dashboard data.");
      if (err.isPaused) {
        setIsDbPaused(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    try {
      if (localStorage.getItem('hide_offline_banner') === 'true') {
        setHideOfflineBanner(true);
      }
    } catch {}
    loadData();
  }, []);

  const stats = [
    { label: "Total Books", value: libraryStats.totalBooks.toString(), icon: BookOpen, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Books Read", value: libraryStats.booksRead.toString(), icon: BookCheck, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Duplicate Alerts", value: libraryStats.duplicateAlerts.toString(), icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Reading Time", value: `${libraryStats.readingTimeHours} hr`, icon: Clock, color: "text-purple-400", bg: "bg-purple-400/10" },
  ];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const progress = profile ? Math.min(Math.round((libraryStats.booksRead / profile.reading_goal) * 100), 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white mb-2">
            Welcome back, {profile?.display_name || 'Manish'}.
          </h1>
          <p className="text-white/50">Your library is growing! You added {libraryStats.totalBooks} books so far.</p>
        </div>
        <button className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2 backdrop-blur-md text-sm font-medium">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          View Full Analytics
        </button>
      </div>

      {isDbPaused && !hideOfflineBanner && (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-transparent p-6 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-outfit font-bold text-white mb-1">⚡ Local Library Mode Active</h3>
              <p className="text-sm text-white/70 max-w-xl">
                Your library database is retrieved and running fast in your browser! All your books, reading statistics, and changes are automatically saved locally.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto flex-shrink-0">
            <button 
              onClick={loadData}
              className="flex-1 md:flex-initial px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 text-center text-sm flex items-center justify-center gap-2"
            >
              Refresh Library
            </button>
            <button
              onClick={() => {
                setHideOfflineBanner(true);
                try { localStorage.setItem('hide_offline_banner', 'true'); } catch {}
              }}
              title="Dismiss banner"
              className="p-2.5 bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white rounded-xl transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goal Tracker Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 glass-card p-6 rounded-3xl border border-amber-500/10 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Target className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Annual Reading Goal</h3>
                <p className="text-sm text-white/50">You've read {libraryStats.booksRead} out of {profile?.reading_goal || 50} books this year.</p>
              </div>
            </div>
            
            <div className="flex-1 max-w-md w-full">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-white">{progress}% Complete</span>
                <span className="text-xs text-white/30 uppercase tracking-widest font-bold">Goal: {profile?.reading_goal || 50} Books</span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-colors"
              >
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} blur-2xl group-hover:bg-opacity-20 transition-all`} />
                <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-white/50 text-sm mb-1">{stat.label}</p>
                <h3 className="text-3xl font-outfit font-bold text-white">{stat.value}</h3>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recently Added List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="lg:col-span-2 glass-card rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-outfit font-semibold text-white">Recently Added</h2>
            <button className="text-sm text-white/50 hover:text-white flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {recentBooks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/50">No books added yet. Head over to the scanner!</p>
              </div>
            ) : (
              recentBooks.map((book) => (
                <div key={book.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-4">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-12 h-16 object-cover rounded shadow-md border border-white/5" />
                    ) : (
                      <div className="w-12 h-16 bg-black/40 rounded shadow-md border border-white/5 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-white/20" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-white font-medium group-hover:text-amber-400 transition-colors line-clamp-1">{book.title}</h4>
                      <p className="text-sm text-white/50 line-clamp-1">{book.author}</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-6">
                    <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                      {book.shelf}
                    </span>
                    <span className={`text-xs font-medium flex items-center gap-1.5 ${
                      book.status === 'Read' ? 'text-emerald-400' : 
                      book.status === 'Reading' ? 'text-amber-400' : 'text-white/40'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        book.status === 'Read' ? 'bg-emerald-400' : 
                        book.status === 'Reading' ? 'bg-amber-400' : 'bg-white/40'
                      }`} />
                      {book.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* AI Recommendations */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="glass-card rounded-2xl p-6 flex flex-col relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-outfit font-semibold text-white">AI For You</h2>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/5 border border-white/10 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <BookOpen className="w-24 h-24" />
              </div>
              <p className="text-xs text-emerald-400 font-medium mb-1 tracking-wider uppercase">Because you like Sci-Fi</p>
              <h4 className="text-lg font-outfit font-bold text-white mb-1">Project Hail Mary</h4>
              <p className="text-sm text-white/50 mb-3">By Andy Weir</p>
              <button className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">
                Add to Wishlist
              </button>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/5 border border-white/10 relative overflow-hidden group">
              <p className="text-xs text-purple-400 font-medium mb-1 tracking-wider uppercase">Missing Volume</p>
              <h4 className="text-lg font-outfit font-bold text-white mb-1">Dune Messiah</h4>
              <p className="text-sm text-white/50 mb-3">Complete your Sci-Fi shelf</p>
              <button className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">
                Find Prices
              </button>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
