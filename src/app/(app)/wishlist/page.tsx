"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  Trash2, 
  ExternalLink, 
  ArrowUpRight, 
  Tag, 
  TrendingDown, 
  Loader2, 
  BookPlus,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import { getWishlist, removeFromWishlist, WishlistItem } from "@/lib/wishlistService";
import { addBook } from "@/lib/bookService";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function loadWishlist() {
      const data = await getWishlist();
      setWishlist(data);
      setIsLoading(false);
    }
    loadWishlist();
  }, []);

  const handleDelete = async (id: string) => {
    setIsProcessing(id);
    const success = await removeFromWishlist(id);
    if (success) {
      setWishlist(wishlist.filter(item => item.id !== id));
    }
    setIsProcessing(null);
  };

  const handleMoveToLibrary = async (item: WishlistItem) => {
    setIsProcessing(item.id);
    try {
      // 1. Add to main library
      await addBook({
        title: item.title,
        author: item.author,
        isbn: item.isbn,
        cover_url: item.cover_url,
        shelf: "Purchased",
        status: "Unread"
      });

      // 2. Remove from wishlist
      await removeFromWishlist(item.id);
      setWishlist(wishlist.filter(w => w.id !== item.id));
    } catch (error) {
      console.error("Failed to move item to library", error);
    }
    setIsProcessing(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-white/50">Viewing your desires...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white mb-2">My Wishlist</h1>
          <p className="text-white/50">Books you're tracking to add to your collection.</p>
        </div>
        <div className="flex bg-white/5 border border-white/10 rounded-xl px-4 py-2 items-center gap-2 text-sm text-white/70">
          <Tag className="w-4 h-4 text-emerald-400" />
          <span>{wishlist.length} Items Tracked</span>
        </div>
      </div>

      {wishlist.length === 0 ? (
        <div className="glass-card rounded-3xl p-20 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
            <Heart className="w-10 h-10 text-white/10" />
          </div>
          <h3 className="text-2xl font-outfit font-bold text-white mb-3">Your wishlist is empty</h3>
          <p className="text-white/50 max-w-sm mb-8">
            Start adding books you'd love to own. Use the scanner or ask BookMind AI for recommendations!
          </p>
          <button className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Get Recommendations
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {wishlist.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-2xl p-5 border border-white/5 group hover:border-white/10 transition-all flex gap-6 relative overflow-hidden"
            >
              {/* Cover Art */}
              <div className="w-32 aspect-[2/3] rounded-lg overflow-hidden border border-white/10 shadow-lg flex-shrink-0">
                {item.cover_url ? (
                  <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-black/40 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-white/5" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-400 transition-colors line-clamp-1">{item.title}</h3>
                  <p className="text-sm text-white/50 mb-4">{item.author}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-white/30 uppercase tracking-wider">Current Price</span>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <TrendingDown className="w-3 h-3" />
                        <span>${item.current_price?.toFixed(2) || '24.99'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-white/30 uppercase tracking-wider">Target Price</span>
                      <span className="text-white/70">${item.target_price?.toFixed(2) || '19.99'}</span>
                    </div>
                    {/* Progress Bar (Simulated Price History) */}
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="w-[75%] h-full bg-emerald-500/50" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button 
                    onClick={() => handleMoveToLibrary(item)}
                    disabled={isProcessing === item.id}
                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookPlus className="w-3.5 h-3.5" />}
                    Obtained
                  </button>
                  <button className="p-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition-all shadow-md">
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    disabled={isProcessing === item.id}
                    className="p-2 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Price Drop Badge */}
              <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                -20% Drop
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
