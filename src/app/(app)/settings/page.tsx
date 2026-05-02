"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Target, 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  Palette, 
  Trash2, 
  Save,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { getProfile, updateProfile, Profile } from "@/lib/profileService";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [readingGoal, setReadingGoal] = useState(50);

  useEffect(() => {
    async function loadProfile() {
      const p = await getProfile();
      if (p) {
        setProfile(p);
        setDisplayName(p.display_name);
        setReadingGoal(p.reading_goal);
      }
      setIsLoading(false);
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const updated = await updateProfile({ 
      display_name: displayName, 
      reading_goal: readingGoal 
    });
    if (updated) {
      setProfile(updated);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-white/50">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white mb-2">Settings</h1>
          <p className="text-white/50">Manage your profile and application preferences.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Settings saved successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation Sidebar (Local) */}
        <div className="space-y-2">
          {[
            { name: "Profile", icon: User, active: true },
            { name: "Reading Goals", icon: Target },
            { name: "Appearance", icon: Palette },
            { name: "Notifications", icon: Bell },
            { name: "Security", icon: Shield }
          ].map((item) => (
            <button 
              key={item.name}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                item.active ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Section */}
          <section className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-amber-500/10">
                {displayName.charAt(0)}
              </div>
              <div>
                <h3 className="text-white font-semibold">Profile Photo</h3>
                <p className="text-xs text-white/30 mb-3">Upload a custom avatar for your library profile.</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white font-medium transition-colors">
                    Upload
                  </button>
                  <button className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/50 font-medium">Display Name</label>
                <input 
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="Enter your name"
                />
              </div>
            </div>
          </section>

          {/* Reading Goals Section */}
          <section className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-white">Annual Reading Goal</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-outfit font-bold text-white">{readingGoal}</div>
                  <div className="text-xs text-white/30 font-medium uppercase tracking-wider">Books per year</div>
                </div>
                <div className="text-xs text-white/50 text-right max-w-[150px]">
                  Setting a goal helps you stay motivated to finish your collection.
                </div>
              </div>
              
              <input 
                type="range"
                min="1"
                max="200"
                value={readingGoal}
                onChange={(e) => setReadingGoal(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </section>

          {/* Danger Zone */}
          <section className="p-6 border border-red-500/10 rounded-2xl bg-red-500/5 space-y-4">
            <div>
              <h3 className="text-red-400 font-semibold flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Danger Zone
              </h3>
              <p className="text-xs text-white/30">Permanently delete your account and all library data.</p>
            </div>
            <button className="px-4 py-2 border border-red-500/20 hover:bg-red-500/10 text-red-400 text-xs font-bold rounded-lg transition-all uppercase tracking-widest">
              Delete Collection
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

import { AnimatePresence } from "framer-motion";
