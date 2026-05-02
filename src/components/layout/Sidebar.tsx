"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Library, 
  ScanBarcode, 
  Heart, 
  Settings, 
  Search,
  BookOpen
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "My Library", href: "/library", icon: Library },
  { name: "Scan Book", href: "/scanner", icon: ScanBarcode },
  { name: "Wishlist", href: "/wishlist", icon: Heart },
  { name: "Search", href: "/search", icon: Search },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.aside 
      className="fixed left-0 top-0 h-screen w-20 md:w-64 glass-panel border-r border-white/10 z-40 flex flex-col transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3 p-6 mt-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <h1 className={`font-outfit font-bold text-xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 transition-opacity duration-300 ${isHovered ? 'md:opacity-100' : 'md:opacity-100 hidden md:block'}`}>
          BookMind
        </h1>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href}>
              <div className={`relative flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group ${isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-full shadow-[0_0_10px_rgba(245,158,11,0.8)]"
                  />
                )}
                <Icon className={`w-6 h-6 ${isActive ? 'text-amber-400' : 'group-hover:text-amber-200 transition-colors'}`} />
                <span className={`font-medium transition-opacity duration-300 ${isHovered ? 'md:opacity-100' : 'md:opacity-100 hidden md:block'}`}>
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto space-y-2">
        <Link href="/settings">
          <div className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all ${pathname === '/settings' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
            <Settings className="w-6 h-6" />
            <span className={`font-medium ${isHovered ? 'md:opacity-100' : 'md:opacity-100 hidden md:block'}`}>
              Settings
            </span>
          </div>
        </Link>
        
        <div className="pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
              A
            </div>
            <div className={`flex flex-col transition-opacity duration-300 ${isHovered ? 'md:opacity-100' : 'md:opacity-100 hidden md:block'}`}>
              <span className="text-xs font-bold text-white">Alex</span>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Premium Plan</span>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
