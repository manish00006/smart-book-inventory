"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  BookOpen, 
  Loader2,
  Trash2,
  ChevronDown,
  BookMarked,
  AlertTriangle,
  X
} from "lucide-react";
import { searchBooks, updateBook, deleteBook, Book } from "@/lib/bookService";

const STATUS_OPTIONS = ["Read", "Reading", "Partial Read", "Not Read"];
const FILTER_OPTIONS = ["All", ...STATUS_OPTIONS];

const statusColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  "Read": { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-400" },
  "Reading": { bg: "bg-amber-500/20", border: "border-amber-500/40", text: "text-amber-400", dot: "bg-amber-400" },
  "Partial Read": { bg: "bg-blue-500/20", border: "border-blue-500/40", text: "text-blue-400", dot: "bg-blue-400" },
  "Not Read": { bg: "bg-white/10", border: "border-white/20", text: "text-white/50", dot: "bg-white/40" },
  "Unread": { bg: "bg-white/10", border: "border-white/20", text: "text-white/50", dot: "bg-white/40" },
};

function getStatusStyle(status: string) {
  return statusColors[status] || statusColors["Not Read"];
}

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadBooks = async () => {
    setIsLoading(true);
    // Map filter values: "Not Read" in UI corresponds to "Unread" or "Not Read" in DB
    const filterValue = statusFilter === "Not Read" ? "Not Read" : statusFilter;
    const results = await searchBooks(searchQuery, filterValue);
    setBooks(results);
    setIsLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBooks();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleStatusUpdate = async (bookId: string, newStatus: string) => {
    await updateBook(bookId, { status: newStatus });
    setBooks(books.map(b => b.id === bookId ? { ...b, status: newStatus } : b));
    setOpenDropdownId(null);
    setToast({ message: `Status updated to "${newStatus}"`, type: "success" });
  };

  const handleDelete = async (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    const success = await deleteBook(bookId);
    if (success) {
      setBooks(books.filter(b => b.id !== bookId));
      setToast({ message: `"${book?.title}" removed from library`, type: "success" });
    } else {
      setToast({ message: "Failed to delete book", type: "error" });
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl border backdrop-blur-xl shadow-lg flex items-center gap-3 ${
              toast.type === "success" 
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" 
                : "bg-red-500/20 border-red-500/40 text-red-300"
            }`}
          >
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-0.5 hover:bg-white/10 rounded transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#1a1c2e] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl z-10"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-lg font-outfit font-bold text-white mb-2">Delete Book?</h3>
                <p className="text-white/50 text-sm mb-6">
                  Are you sure you want to remove <strong className="text-white">{books.find(b => b.id === deleteConfirmId)?.title}</strong> from your library? This action cannot be undone.
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
        {FILTER_OPTIONS.map((status) => (
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
                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 gap-2">
                  {/* Status dropdown */}
                  <div className="relative" ref={openDropdownId === book.id ? dropdownRef : undefined}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(openDropdownId === book.id ? null : book.id);
                      }}
                      className={`w-full py-1.5 px-3 rounded-lg flex items-center justify-between text-xs font-medium transition-colors ${getStatusStyle(book.status).bg} ${getStatusStyle(book.status).border} border ${getStatusStyle(book.status).text}`}
                    >
                      <span>{book.status === "Unread" ? "Not Read" : book.status}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <AnimatePresence>
                      {openDropdownId === book.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute bottom-full left-0 w-full mb-1 bg-[#1a1c2e] border border-white/15 rounded-lg overflow-hidden shadow-xl z-50"
                        >
                          {STATUS_OPTIONS.map(s => (
                            <button
                              key={s}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(book.id, s);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                                book.status === s ? "bg-amber-500/10 text-amber-400" : "text-white/70 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(s).dot}`} />
                              {s}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {/* Delete button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(book.id);
                    }}
                    className="w-full py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
                {/* Status badge */}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${getStatusStyle(book.status).bg} ${getStatusStyle(book.status).border} ${getStatusStyle(book.status).text}`}>
                  {book.status === "Unread" ? "Not Read" : book.status}
                </div>
              </div>
              <h4 className="text-white font-medium text-sm line-clamp-1 group-hover:text-amber-400 transition-colors">{book.title}</h4>
              <p className="text-white/40 text-xs line-clamp-1">{book.author}</p>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5 border border-white/5">
          {books.map((book) => (
            <div key={book.id} className="flex items-center gap-4 sm:gap-6 p-4 hover:bg-white/5 transition-colors group">
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
              {/* Status Dropdown */}
              <div className="relative" ref={openDropdownId === `list-${book.id}` ? dropdownRef : undefined}>
                <button 
                  onClick={() => setOpenDropdownId(openDropdownId === `list-${book.id}` ? null : `list-${book.id}`)}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium border transition-colors ${getStatusStyle(book.status).bg} ${getStatusStyle(book.status).border} ${getStatusStyle(book.status).text}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(book.status).dot}`} />
                  <span className="hidden sm:inline">{book.status === "Unread" ? "Not Read" : book.status}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {openDropdownId === `list-${book.id}` && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute top-full right-0 mt-1 w-36 bg-[#1a1c2e] border border-white/15 rounded-lg overflow-hidden shadow-xl z-50"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusUpdate(book.id, s)}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                            book.status === s ? "bg-amber-500/10 text-amber-400" : "text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(s).dot}`} />
                          {s}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* Delete button */}
              <button 
                onClick={() => setDeleteConfirmId(book.id)}
                className="p-2 bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 border border-transparent hover:border-red-500/30 rounded-lg transition-all"
                title="Delete book"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
