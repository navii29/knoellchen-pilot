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
    <div className="h-16 bg-white/70 backdrop-blur-xl border-b border-stone-200/70 px-4 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={openSidebar}
          className="md:hidden touch-target -ml-2 flex items-center justify-center text-stone-700 hover:text-stone-900"
          aria-label="Menü öffnen"
        >
          <Menu size={20} />
        </button>
        <div className="text-[14px] font-medium text-stone-700 truncate tracking-tight">
          {section ?? ""}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-2.5">
        {/* Desktop search */}
        <div className="relative hidden md:block">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            placeholder="Kennzeichen, AZ, Mieter…"
            className="pl-9 pr-4 h-9 bg-stone-100/80 rounded-full text-[13.5px] border border-transparent placeholder:text-stone-400 w-72 outline-none focus:bg-white focus:border-stone-200 focus:ring-2 focus:ring-stone-200/60 transition-all"
          />
        </div>

        {/* Mobile search button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="md:hidden touch-target flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full"
          aria-label="Suche öffnen"
        >
          <Search size={18} />
        </button>

        <button
          className="touch-target hidden md:flex items-center justify-center w-9 h-9 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          aria-label="Benachrichtigungen"
        >
          <Bell size={15} />
        </button>

        <Link
          href="/dashboard/upload"
          className="touch-target inline-flex items-center justify-center gap-2 text-[13.5px] px-4 md:px-5 h-9 rounded-full font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.08)]"
          aria-label="Strafzettel hochladen"
        >
          <Upload size={14} strokeWidth={2.25} />
          <span className="hidden md:inline">Hochladen</span>
        </Link>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white animate-in fade-in">
          <div className="h-16 px-4 flex items-center gap-3 border-b border-stone-200/70">
            <button
              onClick={() => setSearchOpen(false)}
              className="touch-target flex items-center justify-center text-stone-500"
              aria-label="Suche schließen"
            >
              <X size={20} />
            </button>
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                autoFocus
                placeholder="Kennzeichen, AZ, Mieter…"
                className="w-full pl-9 pr-4 h-10 bg-stone-100 rounded-full text-[14px] border border-transparent placeholder:text-stone-400 outline-none focus:bg-white focus:border-stone-200"
              />
            </div>
          </div>
          <div className="px-4 py-8 text-sm text-stone-400 text-center">
            Tippe ein Suchbegriff ein…
          </div>
        </div>
      )}
    </div>
  );
};
