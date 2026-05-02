"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanBarcode, AlertTriangle, BookCheck, Database, Loader2, CheckCircle2 } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { checkIfDuplicate, addBook, BookInsert } from "@/lib/bookService";

type ScanResult = "duplicate" | "new" | "loading" | "saved" | null;
type BookData = { title: string; author: string; isbn: string; coverUrl?: string; shelf?: string } | null;

export default function ScannerPage() {
  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [bookData, setBookData] = useState<BookData>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Initialize Scanner
  useEffect(() => {
    if (!isScanning) return;
    
    // Slight delay to ensure DOM element exists
    const timer = setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 150 } },
        /* verbose= */ false
      );

      scannerRef.current.render(
        async (decodedText) => {
          // Pause scanner
          scannerRef.current?.pause(true);
          setIsScanning(false);
          setScanResult("loading");
          
          try {
            // 1. Check if we already have this ISBN in the DB
            const isDup = await checkIfDuplicate(decodedText);

            // 2. Fetch book data from OpenLibrary API
            const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${decodedText}&format=json&jscmd=data`);
            const data = await response.json();
            const bookKey = `ISBN:${decodedText}`;
            
            if (data[bookKey]) {
              const bookInfo = data[bookKey];
              
              setBookData({
                title: bookInfo.title,
                author: bookInfo.authors?.[0]?.name || "Unknown Author",
                isbn: decodedText,
                coverUrl: bookInfo.cover?.large || bookInfo.cover?.medium || undefined,
                shelf: "Recently Scanned"
              });
              
              setScanResult(isDup ? "duplicate" : "new");
            } else {
              throw new Error("Book not found in OpenLibrary database.");
            }
          } catch (err: any) {
            setError(err.message || "Failed to fetch book data.");
            setScanResult(null);
          }
        },
        (err) => {
          // Ignore scanning noise errors
        }
      );
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isScanning]);

  const handleAddToLibrary = async () => {
    if (!bookData) return;
    setIsSaving(true);
    setError(null);
    try {
      const newBook: BookInsert = {
        title: bookData.title,
        author: bookData.author,
        isbn: bookData.isbn,
        cover_url: bookData.coverUrl || null,
        shelf: bookData.shelf || "Uncategorized",
        status: "Unread"
      };
      
      await addBook(newBook);
      setScanResult("saved");
    } catch (err: any) {
      setError("Failed to save book to database. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setBookData(null);
    setError(null);
    setIsSaving(false);
    setIsScanning(true);
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center relative min-h-[600px]">
      <div className="text-center mb-8 z-10">
        <h1 className="text-3xl font-outfit font-bold text-white mb-2">Smart Scanner</h1>
        <p className="text-white/50 max-w-md mx-auto">Point your camera at a barcode, ISBN, or book cover to instantly check your inventory.</p>
      </div>

      <div className="relative w-full max-w-md aspect-[3/4] bg-black/40 rounded-3xl border border-white/10 overflow-hidden shadow-2xl glass-panel z-10 flex flex-col">
        
        {/* Camera container for html5-qrcode */}
        <div id="reader" className={`w-full h-full object-cover bg-black ${!isScanning ? "opacity-0 absolute" : "opacity-100"}`} />

        {/* Scanner overlay UI - only visible when searching */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none p-8 flex items-center justify-center">
             <div className="relative w-[250px] h-[150px]">
                {/* Viewfinder corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-xl" />
                
                {/* Animated Scanning Beam */}
                <motion.div 
                  animate={{ y: [0, 150, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute top-0 left-0 w-full h-1 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,1)]"
                />
             </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-20">
            <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
            <p className="text-white mb-6">{error}</p>
            <button onClick={resetScanner} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">Try Again</button>
          </div>
        )}

        {scanResult === 'loading' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
            <p className="text-white/70 animate-pulse">Fetching book details...</p>
          </div>
        )}

        {/* Scan Results Modal Overlay */}
        <AnimatePresence>
          {(scanResult === 'duplicate' || scanResult === 'new' || scanResult === 'saved') && bookData && (
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className={`absolute bottom-0 left-0 w-full p-6 backdrop-blur-xl border-t flex flex-col items-center text-center z-20 ${
                scanResult === 'duplicate' ? 'bg-amber-500/20 border-amber-500/30' : 
                scanResult === 'saved' ? 'bg-blue-500/20 border-blue-500/30' :
                'bg-emerald-500/20 border-emerald-500/30'
              }`}
            >
              {scanResult === 'duplicate' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-outfit font-bold text-white mb-1">Duplicate Detected!</h3>
                  <p className="text-sm text-white/70 mb-4">You already own <strong className="text-white">{bookData.title}</strong>.<br/>Located on: <span className="text-amber-400 font-medium">{bookData.shelf}</span></p>
                </>
              ) : scanResult === 'saved' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-outfit font-bold text-white mb-1">Saved Successfully!</h3>
                  <p className="text-sm text-white/70 mb-4"><strong className="text-white">{bookData.title}</strong> has been added to your library.</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                    <BookCheck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-outfit font-bold text-white mb-1">New Book Found</h3>
                  <p className="text-sm text-white/70 mb-4"><strong className="text-white">{bookData.title}</strong> by {bookData.author}.</p>
                </>
              )}
              
              <div className="flex gap-3 w-full">
                {scanResult === 'new' && (
                  <button 
                    onClick={handleAddToLibrary}
                    disabled={isSaving}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSaving ? "Saving..." : "Add to Library"}
                  </button>
                )}
                <button 
                  onClick={resetScanner}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl font-medium transition-colors"
                >
                  Scan Another
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
      
      {/* Footer controls */}
      <div className="flex gap-4 mt-8 z-10">
        <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-white font-medium transition-colors backdrop-blur-md">
          <Database className="w-4 h-4" />
          Manual Entry
        </button>
        <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-white font-medium transition-colors backdrop-blur-md">
          <ScanBarcode className="w-4 h-4" />
          OCR Mode
        </button>
      </div>
    </div>
  );
}
