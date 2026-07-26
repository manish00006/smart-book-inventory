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
  AlertTriangle,
  X,
  Sparkles,
  Calendar,
  Tag,
  Library,
  User,
  Hash,
  Pencil,
  Save
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

function displayStatus(status: string) {
  return status === "Unread" ? "Not Read" : status;
}

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDbPaused, setIsDbPaused] = useState(false);
  const [hideOfflineBanner, setHideOfflineBanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Book detail modal state
  const [detailBook, setDetailBook] = useState<Book | null>(null);
  const [bookSummary, setBookSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', author: '', isbn: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadBooks = async () => {
    setIsLoading(true);
    setError(null);
    setIsDbPaused(false);
    try {
      const filterValue = statusFilter === "Not Read" ? "Not Read" : statusFilter;
      const results = await searchBooks(searchQuery, filterValue);
      setBooks(results);
    } catch (err: any) {
      console.error("Error loading library books:", err);
      setError(err.message || "Failed to load library books.");
      if (err.isPaused) {
        setIsDbPaused(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      if (localStorage.getItem('hide_offline_banner') === 'true') {
        setHideOfflineBanner(true);
      }
    } catch {}
    const timer = setTimeout(() => {
      loadBooks();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch AI summary when detail modal opens
  useEffect(() => {
    if (!detailBook) {
      setBookSummary(null);
      setSummaryError(null);
      return;
    }

    const fetchSummary = async () => {
      setIsSummaryLoading(true);
      setSummaryError(null);
      setBookSummary(null);
      try {
        const res = await fetch("/api/book-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: detailBook.title, author: detailBook.author }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to fetch summary");
        setBookSummary(json.summary);
      } catch (err: any) {
        console.error("Summary fetch error:", err);
        setSummaryError("Couldn't load summary right now.");
      } finally {
        setIsSummaryLoading(false);
      }
    };

    fetchSummary();
  }, [detailBook]);

  const handleStatusUpdate = async (bookId: string, newStatus: string) => {
    await updateBook(bookId, { status: newStatus });
    setBooks(books.map(b => b.id === bookId ? { ...b, status: newStatus } : b));
    // Also update detail modal if open
    if (detailBook?.id === bookId) {
      setDetailBook({ ...detailBook, status: newStatus });
    }
    setToast({ message: `Status updated to "${newStatus}"`, type: "success" });
  };

  const handleDelete = async (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    const success = await deleteBook(bookId);
    if (success) {
      setBooks(books.filter(b => b.id !== bookId));
      setSelectedBookId(null);
      setDetailBook(null);
      setToast({ message: `"${book?.title}" removed from library`, type: "success" });
    } else {
      setToast({ message: "Failed to delete book", type: "error" });
    }
    setDeleteConfirmId(null);
  };

  const openBookDetail = (book: Book) => {
    setDetailBook(book);
    setIsEditing(false);
  };

  const startEditing = () => {
    if (!detailBook) return;
    setEditForm({ title: detailBook.title, author: detailBook.author, isbn: detailBook.isbn || '' });
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!detailBook) return;
    setIsSavingEdit(true);
    const updated = await updateBook(detailBook.id, {
      title: editForm.title,
      author: editForm.author,
      isbn: editForm.isbn || null,
    } as any);
    if (updated) {
      setBooks(books.map(b => b.id === detailBook.id ? { ...b, title: editForm.title, author: editForm.author, isbn: editForm.isbn || null } : b));
      setDetailBook({ ...detailBook, title: editForm.title, author: editForm.author, isbn: editForm.isbn || null });
      setToast({ message: 'Book updated!', type: 'success' });
    } else {
      setToast({ message: 'Failed to update', type: 'error' });
    }
    setIsEditing(false);
    setIsSavingEdit(false);
  };

  const toggleBookSelect = (bookId: string) => {
    setSelectedBookId(selectedBookId === bookId ? null : bookId);
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

      {/* ========== BOOK DETAIL MODAL ========== */}
      <AnimatePresence>
        {detailBook && (
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailBook(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-[#12141f] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Gradient accent bar */}
              <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 flex-shrink-0" />
              
              {/* Close button */}
              <button 
                onClick={() => setDetailBook(null)}
                className="absolute top-4 right-4 z-20 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors backdrop-blur-sm"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 p-6">
                {/* Top section: Cover + Info */}
                <div className="flex gap-5 mb-6">
                  {/* Book cover */}
                  <div className="w-28 h-40 flex-shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-black/30">
                    {detailBook.cover_url ? (
                      <img src={detailBook.cover_url} alt={detailBook.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-white/20" />
                      </div>
                    )}
                  </div>
                  
                  {/* Book info */}
                  <div className="flex-1 min-w-0 pt-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={e => setEditForm({...editForm, title: e.target.value})}
                          className="w-full bg-white/10 border border-amber-500/40 rounded-lg px-3 py-1.5 text-white text-sm font-bold focus:outline-none focus:border-amber-500"
                          placeholder="Book title"
                        />
                        <input
                          type="text"
                          value={editForm.author}
                          onChange={e => setEditForm({...editForm, author: e.target.value})}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white/80 text-sm focus:outline-none focus:border-amber-500/50"
                          placeholder="Author name"
                        />
                        <input
                          type="text"
                          value={editForm.isbn}
                          onChange={e => setEditForm({...editForm, isbn: e.target.value})}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white/80 text-xs focus:outline-none focus:border-amber-500/50"
                          placeholder="ISBN (optional)"
                        />
                      </div>
                    ) : (
                      <>
                        <h2 className="text-xl font-outfit font-bold text-white leading-tight mb-1.5 line-clamp-3">{detailBook.title}</h2>
                        <p className="text-white/60 text-sm mb-4 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 flex-shrink-0" />
                          {detailBook.author}
                        </p>
                      </>
                    )}
                    
                    {/* Status badge */}
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusStyle(detailBook.status).bg} ${getStatusStyle(detailBook.status).border} ${getStatusStyle(detailBook.status).text}`}>
                      <div className={`w-2 h-2 rounded-full ${getStatusStyle(detailBook.status).dot}`} />
                      {displayStatus(detailBook.status)}
                    </div>
                  </div>
                </div>

                {/* Info chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {detailBook.isbn && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/50">
                      <Hash className="w-3 h-3" />
                      ISBN: <span className="text-white/80">{detailBook.isbn}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/50">
                    <Library className="w-3 h-3" />
                    <span className="text-white/80">{detailBook.shelf}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/50">
                    <Calendar className="w-3 h-3" />
                    Added <span className="text-white/80">{new Date(detailBook.added_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* AI Summary Section */}
                <div className="bg-gradient-to-br from-amber-500/5 to-purple-500/5 border border-white/10 rounded-2xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-outfit font-bold text-white">AI Book Brief</h3>
                  </div>
                  
                  {isSummaryLoading ? (
                    <div className="flex items-center gap-3 py-3">
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3 bg-white/5 rounded-full w-full animate-pulse" />
                        <div className="h-3 bg-white/5 rounded-full w-4/5 animate-pulse" />
                        <div className="h-3 bg-white/5 rounded-full w-3/5 animate-pulse" />
                      </div>
                    </div>
                  ) : summaryError ? (
                    <p className="text-white/30 text-sm italic">{summaryError}</p>
                  ) : bookSummary ? (
                    <p className="text-white/70 text-sm leading-relaxed">{bookSummary}</p>
                  ) : null}
                </div>

                {/* Change Status */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Change Status</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusUpdate(detailBook.id, s)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border transition-all ${
                          detailBook.status === s || (detailBook.status === "Unread" && s === "Not Read")
                            ? `${getStatusStyle(s).bg} ${getStatusStyle(s).border} ${getStatusStyle(s).text} ring-1 ring-white/5`
                            : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${getStatusStyle(s).dot}`} />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Edit / Save buttons */}
                <div className="flex gap-2 mb-3">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={saveEdit}
                        disabled={isSavingEdit || !editForm.title.trim()}
                        className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all"
                      >
                        {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                      </button>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-xl text-sm font-medium transition-all"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={startEditing}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Book Info
                    </button>
                  )}
                </div>

                {/* Delete button */}
                <button 
                  onClick={() => {
                    setDetailBook(null);
                    setDeleteConfirmId(detailBook.id);
                  }}
                  className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove from Library
                </button>
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

      {/* Offline / Free Tier Banner */}
      {isDbPaused && !hideOfflineBanner && (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-transparent p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl mb-6">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/5">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-outfit font-bold text-white mb-1">⚡ Local Library Mode Active</h3>
                <p className="text-white/70 text-sm max-w-xl leading-relaxed">
                  Your library database is retrieved and running fast in your browser! All your books, reading statistics, and edits are automatically saved locally.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto flex-shrink-0">
              <button 
                onClick={loadBooks}
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
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-white/50 animate-pulse">Browsing your library...</p>
        </div>
      ) : error && books.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-red-500/20">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-outfit font-bold text-white mb-2">Error Loading Books</h3>
          <p className="text-white/50 max-w-sm mx-auto mb-6">
            {error}
          </p>
          <button 
            onClick={loadBooks}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all"
          >
            Try Again
          </button>
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
        /* ===== GRID VIEW ===== */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {books.map((book, i) => {
            return (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="flex flex-col cursor-pointer group"
                onClick={() => openBookDetail(book)}
              >
                {/* Book cover — click to open detail */}
                <div 
                  className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 border border-white/10 hover:border-amber-500/50 transition-all shadow-lg group-hover:shadow-amber-500/10 group-hover:scale-[1.02]"
                >
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500/10 to-purple-500/10 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-white/10" />
                    </div>
                  )}

                  {/* Hover overlay hint */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white/0 group-hover:text-white/70 transition-colors" />
                  </div>

                  {/* Status badge (always visible) */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${getStatusStyle(book.status).bg} ${getStatusStyle(book.status).border} ${getStatusStyle(book.status).text}`}>
                    {displayStatus(book.status)}
                  </div>
                </div>
                <h4 className="text-white font-medium text-sm line-clamp-1 group-hover:text-amber-400 transition-colors">{book.title}</h4>
                <p className="text-white/40 text-xs line-clamp-1">{book.author}</p>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* ===== LIST VIEW ===== */
        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5 border border-white/5">
          {books.map((book) => {
            return (
              <div 
                key={book.id}
                onClick={() => openBookDetail(book)}
                className="flex items-center gap-4 sm:gap-6 p-4 cursor-pointer transition-colors hover:bg-white/5 group"
              >
                <div className="w-12 h-16 rounded border border-white/10 overflow-hidden flex-shrink-0 group-hover:border-amber-500/50 transition-all">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500/10 to-purple-500/10 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white/10" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium line-clamp-1 text-white group-hover:text-amber-400 transition-colors">{book.title}</h4>
                  <p className="text-white/50 text-sm">{book.author}</p>
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-1">Shelf</div>
                  <div className="text-sm text-white/70">{book.shelf}</div>
                </div>
                {/* Status badge */}
                <div className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 ${getStatusStyle(book.status).bg} ${getStatusStyle(book.status).border} ${getStatusStyle(book.status).text}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(book.status).dot}`} />
                  <span className="hidden sm:inline">{displayStatus(book.status)}</span>
                </div>
                <Sparkles className="w-4 h-4 text-white/10 group-hover:text-amber-500/50 transition-colors" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
