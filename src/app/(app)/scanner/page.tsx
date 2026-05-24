"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanBarcode, AlertTriangle, BookCheck, Database, Loader2, CheckCircle2, X, BookOpen, User, Hash, Library, Camera, ImagePlus, Trash2, Sparkles } from "lucide-react";
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

  // Photo capture state
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null); // base64 data URL
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
            let title = "";
            let author = "";
            let coverUrl: string | undefined;
            let found = false;

            // 1️⃣ Try OpenLibrary first
            try {
              const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${decodedText}&format=json&jscmd=data`);
              const olData = await olRes.json();
              const bookKey = `ISBN:${decodedText}`;
              if (olData[bookKey]) {
                const info = olData[bookKey];
                title = info.title;
                author = info.authors?.[0]?.name || "Unknown Author";
                coverUrl = info.cover?.large || info.cover?.medium || undefined;
                found = true;
              }
            } catch (olErr) {
              console.warn("OpenLibrary lookup failed, trying fallback...", olErr);
            }

            // 2️⃣ Fallback: Google Books API
            if (!found) {
              try {
                const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${decodedText}`);
                const gbData = await gbRes.json();
                if (gbData.totalItems > 0 && gbData.items?.[0]?.volumeInfo) {
                  const vol = gbData.items[0].volumeInfo;
                  title = vol.title || "";
                  author = vol.authors?.[0] || "Unknown Author";
                  coverUrl = vol.imageLinks?.thumbnail?.replace("http:", "https:") || undefined;
                  found = true;
                }
              } catch (gbErr) {
                console.warn("Google Books lookup also failed.", gbErr);
              }
            }

            if (found) {
              setBookData({
                title,
                author,
                isbn: decodedText,
                coverUrl,
                shelf: "Recently Scanned"
              });
              setScanResult(isDup ? "duplicate" : "new");
            } else {
              // 3️⃣ Neither API found it — open manual entry pre-filled with ISBN
              setScanResult(null);
              setManualForm(prev => ({ ...prev, isbn: decodedText }));
              setIsManualModalOpen(true);
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

  // Client-side OpenLibrary lookup (FREE, no rate limits!)
  const lookupOpenLibrary = async (query: string, type: 'isbn' | 'text') => {
    try {
      const url = type === 'isbn'
        ? `https://openlibrary.org/search.json?isbn=${encodeURIComponent(query)}&limit=1&fields=title,author_name,isbn,cover_i`
        : `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1&fields=title,author_name,isbn,cover_i`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.numFound > 0 && data.docs?.[0]) {
        const doc = data.docs[0];
        const coverId = doc.cover_i;
        return {
          title: doc.title || '',
          author: doc.author_name?.[0] || '',
          isbn: doc.isbn?.[0] || '',
          coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : '',
        };
      }
    } catch (e) {
      console.warn('Client OpenLibrary lookup failed:', e);
    }
    return null;
  };

  // Handle photo capture from camera or file picker
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCapturedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setCapturedPhoto(base64);

      // Show loading state on the scanner area
      setIsScanning(false);
      setScanResult("loading");
      setIsExtracting(true);

      try {
        // 🧠 Step 1: Send to AI Vision API
        let bookInfo = { title: '', author: '', isbn: '', coverUrl: '' };
        
        try {
          const res = await fetch("/api/extract-book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64 }),
          });
          if (res.ok) {
            const json = await res.json();
            bookInfo = {
              title: json.title || '',
              author: json.author || '',
              isbn: json.isbn || '',
              coverUrl: json.coverUrl || '',
            };
          }
        } catch (apiErr) {
          console.warn("Server API failed:", apiErr);
        }

        // 🔍 Step 2: Client-side fallback if server didn't get title
        if (!bookInfo.title && bookInfo.isbn) {
          console.log("Server returned ISBN but no title, trying client-side OpenLibrary...");
          // Try ISBN lookup
          const ol1 = await lookupOpenLibrary(bookInfo.isbn, 'isbn');
          if (ol1?.title) {
            bookInfo = { ...bookInfo, title: ol1.title, author: ol1.author || bookInfo.author, coverUrl: ol1.coverUrl || bookInfo.coverUrl, isbn: ol1.isbn || bookInfo.isbn };
          }
          // Try as text search
          if (!bookInfo.title) {
            const ol2 = await lookupOpenLibrary(bookInfo.isbn, 'text');
            if (ol2?.title) {
              bookInfo = { ...bookInfo, title: ol2.title, author: ol2.author || bookInfo.author, coverUrl: ol2.coverUrl || bookInfo.coverUrl, isbn: ol2.isbn || bookInfo.isbn };
            }
          }
        }

        // If we have a title now → auto-save
        if (bookInfo.title) {
          // Upload cover photo if no database cover exists
          let coverUrl = bookInfo.coverUrl || null;
          if (!coverUrl && file) {
            const formData = new FormData();
            formData.append("file", file);
            try {
              const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
              const uploadJson = await uploadRes.json();
              if (uploadRes.ok) coverUrl = uploadJson.url;
            } catch (uploadErr) {
              console.warn("Cover upload failed:", uploadErr);
            }
          }

          // Check for duplicates
          const isDup = bookInfo.isbn ? await checkIfDuplicate(bookInfo.isbn) : false;

          if (isDup) {
            setBookData({
              title: bookInfo.title,
              author: bookInfo.author || "Unknown Author",
              isbn: bookInfo.isbn,
              coverUrl: coverUrl || undefined,
            });
            setScanResult("duplicate");
            setIsExtracting(false);
            return;
          }

          // 💾 Auto-save to library
          const newBook: BookInsert = {
            title: bookInfo.title,
            author: bookInfo.author || "Unknown Author",
            isbn: bookInfo.isbn || null,
            cover_url: coverUrl,
            shelf: "Recently Scanned",
            status: "Not Read",
          };
          await addBook(newBook);

          setBookData({
            title: bookInfo.title,
            author: bookInfo.author || "Unknown Author",
            isbn: bookInfo.isbn,
            coverUrl: coverUrl || undefined,
          });
          setScanResult("saved");
        } else {
          // Still no title — fall back to manual entry
          setScanResult(null);
          setManualForm(prev => ({
            ...prev,
            title: bookInfo.title || prev.title,
            author: bookInfo.author || prev.author,
            isbn: bookInfo.isbn || prev.isbn,
          }));
          setIsManualModalOpen(true);
        }
      } catch (err) {
        console.warn("Extraction failed, opening manual entry:", err);
        setScanResult(null);
        setIsManualModalOpen(true);
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setCapturedPhoto(null);
    setCapturedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload photo to server
  const uploadPhoto = async (): Promise<string | null> => {
    if (!capturedFile) return null;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", capturedFile);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Upload failed");
      }
      return json.url;
    } catch (err: any) {
      console.error("Photo upload error:", err);
      // If upload fails, convert to base64 data URL as fallback
      return capturedPhoto;
    } finally {
      setIsUploading(false);
    }
  };

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
      // Clear scan result so error overlay doesn't overlap with book panel
      setScanResult(null);
      setError(err.message || "Failed to save book. Please try again.");
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

      // Upload photo if captured
      let coverUrl: string | null = null;
      if (capturedFile) {
        coverUrl = await uploadPhoto();
      }

      const newBook: BookInsert = {
        title: manualForm.title,
        author: manualForm.author,
        isbn: manualForm.isbn || null,
        cover_url: coverUrl,
        shelf: manualForm.shelf,
        status: "Not Read"
      };
      await addBook(newBook);
      setIsManualModalOpen(false);
      setManualForm({ title: "", author: "", isbn: "", shelf: "Main Shelf" });
      setCapturedPhoto(null);
      setCapturedFile(null);
      setBookData({ title: newBook.title, author: newBook.author, isbn: newBook.isbn || "", coverUrl: coverUrl || undefined });
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
    setCapturedPhoto(null);
    setCapturedFile(null);
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
            {isExtracting ? (
              <>
                <Sparkles className="w-10 h-10 text-amber-500 animate-pulse mb-4" />
                <p className="text-white/70 animate-pulse font-medium">AI analyzing your photo...</p>
                <p className="text-white/40 text-xs mt-2">Extracting title, author & saving</p>
              </>
            ) : (
              <>
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
                <p className="text-white/70 animate-pulse">Fetching book details...</p>
              </>
            )}
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
      
      <div className="flex flex-col gap-3 mt-8 z-40 relative w-full max-w-md px-4">
        {/* Primary row: Two big photo buttons */}
        <div className="flex gap-3">
          <button 
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute("capture", "environment");
                fileInputRef.current.click();
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/30"
          >
            <Camera className="w-5 h-5" />
            Snap Cover
          </button>
          <button 
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute("capture");
                fileInputRef.current.click();
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-purple-500/30"
          >
            <ImagePlus className="w-5 h-5" />
            Gallery
          </button>
        </div>
        {/* Secondary row: Manual Entry */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsManualModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-white font-medium transition-colors backdrop-blur-md"
        >
          <Database className="w-4 h-4" />
          Manual Entry
        </button>
      </div>

      {/* Hidden file input for camera capture */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
        id="book-cover-capture"
      />

      {/* Manual Entry Modal */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsManualModalOpen(false); removePhoto(); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#1a1c2e] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-y-auto max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-300" />
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-outfit font-bold text-white">Manual Entry</h2>
                  <p className="text-white/50 text-sm">Add book details & snap a cover photo</p>
                </div>
                <button 
                  onClick={() => { setIsManualModalOpen(false); removePhoto(); }}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-white/50" />
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                
                {/* 📸 Book Cover Photo Section */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider ml-1">Book Cover Photo</label>
                  
                  {!capturedPhoto ? (
                    <div className="flex gap-3">
                      {/* Take Photo Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.setAttribute("capture", "environment");
                            fileInputRef.current.click();
                          }
                        }}
                        className="flex-1 flex flex-col items-center justify-center gap-2 py-5 bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-dashed border-amber-500/40 rounded-2xl hover:border-amber-500/70 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Camera className="w-5 h-5 text-amber-400" />
                        </div>
                        <span className="text-sm text-amber-300 font-medium">Take Photo</span>
                      </button>

                      {/* Choose from Gallery */}
                      <button
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.removeAttribute("capture");
                            fileInputRef.current.click();
                          }
                        }}
                        className="flex-1 flex flex-col items-center justify-center gap-2 py-5 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-2 border-dashed border-purple-500/40 rounded-2xl hover:border-purple-500/70 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <ImagePlus className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-sm text-purple-300 font-medium">From Gallery</span>
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative w-full aspect-[3/4] max-h-[200px] rounded-2xl overflow-hidden border border-white/10 bg-black/30"
                    >
                      <img 
                        src={capturedPhoto}
                        alt="Captured book cover"
                        className="w-full h-full object-contain"
                      />
                      {/* Extracting overlay */}
                      {isExtracting && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
                          <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                          <span className="text-xs text-amber-300 font-medium animate-pulse">AI reading cover...</span>
                        </div>
                      )}
                      {/* Overlay with status */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-between z-20">
                        <div className="flex items-center gap-2">
                          {isExtracting ? (
                            <><Loader2 className="w-4 h-4 text-amber-400 animate-spin" /><span className="text-xs text-amber-300 font-medium">Analyzing...</span></>
                          ) : (
                            <><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-xs text-emerald-300 font-medium">Auto-filled ✓</span></>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

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
                  disabled={isSaving || isUploading}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-3 mt-2"
                >
                  {(isSaving || isUploading) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                  {isUploading ? "Uploading Photo..." : isSaving ? "Adding..." : "Add to Collection"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
