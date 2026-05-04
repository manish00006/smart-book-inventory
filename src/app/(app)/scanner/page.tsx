"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanBarcode, AlertTriangle, BookCheck, Database, Loader2, CheckCircle2, X, BookOpen, User, Hash, Library } from "lucide-react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { checkIfDuplicate, addBook, BookInsert } from "@/lib/bookService";

type ScanResult = "duplicate" | "new" | "loading" | "saved" | null;
type BookData = { title: string; author: string; isbn: string; coverUrl?: string; shelf?: string } | null;

export default function ScannerPage() {
  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [bookData, setBookData] = useState<BookData>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  
  // Manual Entry Form State
  const [manualForm, setManualForm] = useState({
    title: "",
    author: "",
    isbn: "",
    shelf: "Main Shelf"
  });
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Initialize Scanner
  useEffect(() => {
    if (!isScanning || isManualModalOpen) return;
    
    const timer = setTimeout(() => {
      // Configuration for better mobile scanning
      const config = {
        fps: 10, // Lower FPS gives the camera more time to auto-focus
        qrbox: { width: 300, height: 150 }, // Fixed wide box is much better for ISBN barcodes
        // Removed aspectRatio to let the camera use its natural, undistorted resolution
        showTorchButtonIfSupported: true,
        useBarCodeDetectorIfSupported: true, // Uses native barcode detector API if available on Android/iOS
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        videoConstraints: {
          facingMode: "environment",
          focusMode: "continuous"
        } as any,
      };

      scannerRef.current = new Html5QrcodeScanner("reader", config, false);

      scannerRef.current.render(
        async (decodedText) => {
          console.log("Barcode detected:", decodedText);
          scannerRef.current?.pause(true);
          setIsScanning(false);
          setScanResult("loading");
          
          try {
            const isDup = await checkIfDuplicate(decodedText);
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
        () => {}
      );
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isScanning, isManualModalOpen]);

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
        status: "Not Read"
      };
      await addBook(newBook);
      setScanResult("saved");
    } catch (err: any) {
      console.error("Scanner Save Error:", err);
      setError(`Failed: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting manual entry:", manualForm);
    setIsSaving(true);
    setError(null);
    try {
      // Check for duplicate by ISBN if provided
      if (manualForm.isbn) {
        const isDup = await checkIfDuplicate(manualForm.isbn);
        if (isDup) {
          setIsManualModalOpen(false);
          setBookData({ title: manualForm.title, author: manualForm.author, isbn: manualForm.isbn });
          setScanResult("duplicate");
          setIsScanning(false);
          setIsSaving(false);
          return;
        }
      }
      const newBook: BookInsert = {
        title: manualForm.title,
        author: manualForm.author,
        isbn: manualForm.isbn || null,
        cover_url: null,
        shelf: manualForm.shelf,
        status: "Not Read"
      };
      await addBook(newBook);
      setIsManualModalOpen(false);
      setManualForm({ title: "", author: "", isbn: "", shelf: "Main Shelf" });
      setBookData({ title: newBook.title, author: newBook.author, isbn: newBook.isbn || "" });
      setScanResult("saved");
      setIsScanning(false);
    } catch (err: any) {
      setError("Failed to add book manually.");
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
    <div className="h-full flex flex-col items-center justify-center relative min-h-[600px] pb-20">
      <div className="text-center mb-8 z-10">
        <h1 className="text-3xl font-outfit font-bold text-white mb-2">Smart Scanner</h1>
        <p className="text-white/50 max-w-md mx-auto">Point your camera at a barcode or use manual entry to add books to your collection.</p>
      </div>

      <div className="relative w-full max-w-md aspect-[3/4] bg-black/40 rounded-3xl border border-white/10 overflow-hidden shadow-2xl glass-panel z-10 flex flex-col">
        <div id="reader" className={`w-full h-full object-cover bg-black ${!isScanning ? "opacity-0 absolute" : "opacity-100"}`} />

        {isScanning && (
          <div className="absolute inset-0 pointer-events-none p-8 flex items-center justify-center">
             <div className="relative w-[250px] h-[150px]">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-xl" />
                <motion.div 
                  animate={{ y: [0, 150, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute top-0 left-0 w-full h-1 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,1)]"
                />
             </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-50">
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

        <AnimatePresence>
          {(scanResult === 'duplicate' || scanResult === 'new' || scanResult === 'saved') && bookData && (
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className={`absolute bottom-0 left-0 w-full p-6 backdrop-blur-xl border-t flex flex-col items-center text-center z-30 ${
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
                  <h3 className="text-xl font-outfit font-bold text-white mb-1">Already in Library!</h3>
                  <p className="text-sm text-white/70 mb-4">This book is already in your library: <strong className="text-white">{bookData.title}</strong>.</p>
                </>
              ) : scanResult === 'saved' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-outfit font-bold text-white mb-1">Success!</h3>
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
      
      <div className="flex gap-4 mt-8 z-40 relative">
        <button 
          onClick={(e) => {
            console.log("Manual Entry clicked");
            e.stopPropagation();
            setIsManualModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full transition-all shadow-lg shadow-amber-500/20 scale-105"
        >
          <Database className="w-5 h-5" />
          Manual Entry
        </button>
        <button className="flex items-center gap-2 px-6 py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-white font-medium transition-colors backdrop-blur-md">
          <ScanBarcode className="w-4 h-4" />
          OCR Mode
        </button>
      </div>

      {/* Manual Entry Modal */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManualModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#1a1c2e] border border-white/10 rounded-3xl p-8 shadow-2xl z-10 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-300" />
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-outfit font-bold text-white">Manual Entry</h2>
                  <p className="text-white/50 text-sm">Add a book details manually</p>
                </div>
                <button 
                  onClick={() => setIsManualModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-white/50" />
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider ml-1">Book Title</label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      required
                      type="text"
                      placeholder="e.g. The Great Gatsby"
                      value={manualForm.title}
                      onChange={e => setManualForm({...manualForm, title: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider ml-1">Author Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      required
                      type="text"
                      placeholder="e.g. F. Scott Fitzgerald"
                      value={manualForm.author}
                      onChange={e => setManualForm({...manualForm, author: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wider ml-1">ISBN (Optional)</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input 
                        type="text"
                        placeholder="13 digits"
                        value={manualForm.isbn}
                        onChange={e => setManualForm({...manualForm, isbn: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wider ml-1">Shelf</label>
                    <div className="relative">
                      <Library className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <select 
                        value={manualForm.shelf}
                        onChange={e => setManualForm({...manualForm, shelf: e.target.value})}
                        className="w-full bg-[#1a1c2e] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
                      >
                        <option value="Main Shelf">Main Shelf</option>
                        <option value="Favorites">Favorites</option>
                        <option value="To Read">To Read</option>
                        <option value="Research">Research</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-3 mt-4"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                  {isSaving ? "Adding..." : "Add to Collection"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
