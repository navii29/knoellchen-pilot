"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Menu, Search, Upload, X } from "lucide-react";
import { SIDEBAR_OPEN_EVENT } from "./Sidebar";

export const Topbar = ({ section }: { section?: string }) => {
  const [searchOpen, setSearchOpen] = useState(false);

  const openSidebar = () => {
    window.dispatchEvent(new Event(SIDEBAR_OPEN_EVENT));
  };

  return (
    <div className="h-16 bg-void-800 border-b border-hairline-dark px-4 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={openSidebar}
          className="md:hidden touch-target -ml-2 flex items-center justify-center text-white/50 hover:text-white"
          aria-label="Menü öffnen"
        >
          <Menu size={20} />
        </button>
        {section && (
          <span className="font-display font-semibold text-[15px] text-white tracking-tightest truncate">
            {section}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-2.5">
        {/* Desktop search */}
        <div className="relative hidden md:block">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            placeholder="Kennzeichen, AZ, Mieter…"
            className="pl-8 pr-4 h-8 bg-void-700 border border-hairline-dark rounded-input text-[13px] font-mono text-white placeholder:text-white/25 w-64 outline-none focus:border-white/20 focus:bg-void-600 transition-all"
          />
        </div>

        {/* Mobile search button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="md:hidden touch-target flex items-center justify-center text-white/40 hover:text-white"
          aria-label="Suche öffnen"
        >
          <Search size={18} />
        </button>

        <button
          className="touch-target hidden md:flex items-center justify-center w-8 h-8 rounded-panel text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Benachrichtigungen"
        >
          <Bell size={15} />
        </button>

        <Link
          href="/dashboard/upload"
          className="touch-target inline-flex items-center justify-center gap-2 text-[13px] px-4 h-8 rounded-btn font-medium bg-signal text-white hover:bg-signal-strong transition-colors shadow-signal"
          aria-label="Strafzettel hochladen"
        >
          <Upload size={13} strokeWidth={2.25} />
          <span className="hidden md:inline">Hochladen</span>
        </Link>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-void-800 animate-in fade-in">
          <div className="h-16 px-4 flex items-center gap-3 border-b border-hairline-dark">
            <button
              onClick={() => setSearchOpen(false)}
              className="touch-target flex items-center justify-center text-white/40 hover:text-white"
              aria-label="Suche schließen"
            >
              <X size={20} />
            </button>
            <div className="relative flex-1">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                autoFocus
                placeholder="Kennzeichen, AZ, Mieter…"
                className="w-full pl-8 pr-4 h-10 bg-void-700 border border-hairline-dark rounded-input text-[14px] font-mono text-white placeholder:text-white/25 outline-none focus:border-white/20 focus:bg-void-600 transition-all"
              />
            </div>
          </div>
          <div className="px-4 py-8 font-mono text-sm text-white/30 text-center">
            Tippe ein Suchbegriff ein…
          </div>
        </div>
      )}
    </div>
  );
};
