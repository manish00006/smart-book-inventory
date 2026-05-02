"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  BookOpen, 
  MoreVertical, 
  Loader2,
  Trash2,
  CheckCircle2,
  BookMarked
} from "lucide-react";
import { searchBooks, updateBook, Book } from "@/lib/bookService";

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const loadBooks = async () => {
    setIsLoading(true);
    const results = await searchBooks(searchQuery, statusFilter);
    setBooks(results);
    setIsLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBooks();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  const handleStatusUpdate = async (bookId: string, newStatus: string) => {
    await updateBook(bookId, { status: newStatus });
    // Optimistic update or reload
    setBooks(books.map(b => b.id === bookId ? { ...b, status: newStatus } : b));
  };

  const statusOptions = ["All", "Unread", "Reading", "Read"];

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white mb-2">My Library</h1>
          <p className="text-white/50">Manage and explore your physical collection.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 w-full md:w-80 transition-all"
            />
          </div>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-amber-500 text-white" : "text-white/40 hover:text-white"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-amber-500 text-white" : "text-white/40 hover:text-white"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/50">
          <Filter className="w-3.5 h-3.5" />
          Filter by Status:
        </div>
        {statusOptions.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
              statusFilter === status 
                ? "bg-amber-500/10 border-amber-500 text-amber-400" 
                : "bg-white/5 border-white/5 text-white/50 hover:border-white/20 hover:text-white"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-white/50 animate-pulse">Browsing your library...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-xl font-outfit font-bold text-white mb-2">No books found</h3>
          <p className="text-white/50 max-w-sm mx-auto">
            {searchQuery 
              ? `We couldn't find any books matching "${searchQuery}".` 
              : "Your library is currently empty. Start by scanning some books!"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {books.map((book, i) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="group flex flex-col"
            >
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 border border-white/10 group-hover:border-amber-500/50 transition-all shadow-lg group-hover:shadow-amber-500/10">
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full bg-black/40 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-white/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleStatusUpdate(book.id, book.status === 'Read' ? 'Unread' : 'Read')}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-colors ${book.status === 'Read' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                  book.status === 'Read' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                  book.status === 'Reading' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' :
                  'bg-white/10 border-white/20 text-white/50'
                }`}>
                  {book.status}
                </div>
              </div>
              <h4 className="text-white font-medium text-sm line-clamp-1 group-hover:text-amber-400 transition-colors">{book.title}</h4>
              <p className="text-white/40 text-xs line-clamp-1">{book.author}</p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5 border border-white/5">
          {books.map((book) => (
            <div key={book.id} className="flex items-center gap-6 p-4 hover:bg-white/5 transition-colors group">
              <div className="w-12 h-16 rounded border border-white/10 overflow-hidden flex-shrink-0">
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-black/40 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-white/10" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium group-hover:text-amber-400 transition-colors line-clamp-1">{book.title}</h4>
                <p className="text-white/50 text-sm">{book.author}</p>
              </div>
              <div className="hidden sm:block">
                <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-1">Shelf</div>
                <div className="text-sm text-white/70">{book.shelf}</div>
              </div>
              <div className="hidden md:block">
                <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-1">Status</div>
                <div className={`text-sm flex items-center gap-2 ${
                  book.status === 'Read' ? 'text-emerald-400' :
                  book.status === 'Reading' ? 'text-amber-400' :
                  'text-white/40'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    book.status === 'Read' ? 'bg-emerald-400' :
                    book.status === 'Reading' ? 'bg-amber-400' :
                    'bg-white/40'
                  }`} />
                  {book.status}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleStatusUpdate(book.id, book.status === 'Read' ? 'Unread' : 'Read')}
                  className={`p-2 rounded-lg transition-colors ${book.status === 'Read' ? 'bg-emerald-500 text-white' : 'bg-white/5 hover:bg-white/10 text-white/50'}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <button className="p-2 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
