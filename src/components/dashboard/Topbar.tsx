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
    <div className="h-14 bg-white border-b border-stone-100 px-3 md:px-6 flex items-center justify-between gap-2 sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={openSidebar}
          className="md:hidden touch-target -ml-2 flex items-center justify-center text-stone-700 hover:text-stone-900"
          aria-label="Menü öffnen"
        >
          <Menu size={20} />
        </button>
        <div className="text-sm font-medium text-stone-700 truncate">{section ?? ""}</div>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        {/* Desktop search */}
        <div className="relative hidden md:block">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-300" />
          <input
            placeholder="Kennzeichen, AZ, Mieter…"
            className="pl-8 pr-3 py-1.5 bg-stone-50 rounded-md text-sm border border-transparent placeholder:text-stone-400 w-64 outline-none focus:bg-white focus:border-stone-200 transition-colors"
          />
        </div>

        {/* Mobile search button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="md:hidden touch-target flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-md"
          aria-label="Suche öffnen"
        >
          <Search size={18} />
        </button>

        <button
          className="touch-target hidden md:flex items-center justify-center p-1.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors"
          aria-label="Benachrichtigungen"
        >
          <Bell size={15} />
        </button>

        <Link
          href="/dashboard/upload"
          className="touch-target inline-flex items-center justify-center gap-1.5 text-sm px-3 md:px-4 py-2 rounded-lg font-medium border border-teal-500 text-teal-700 bg-transparent hover:bg-teal-50 transition-colors"
          aria-label="Strafzettel hochladen"
        >
          <Upload size={15} />
          <span className="hidden md:inline">Strafzettel hochladen</span>
        </Link>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white animate-in fade-in">
          <div className="h-14 px-3 flex items-center gap-2 border-b border-stone-100">
            <button
              onClick={() => setSearchOpen(false)}
              className="touch-target flex items-center justify-center text-stone-500"
              aria-label="Suche schließen"
            >
              <X size={20} />
            </button>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-300" />
              <input
                autoFocus
                placeholder="Kennzeichen, AZ, Mieter…"
                className="w-full pl-8 pr-3 py-2 bg-stone-50 rounded-md text-sm border border-transparent placeholder:text-stone-400 outline-none focus:bg-white focus:border-stone-200"
              />
            </div>
          </div>
          <div className="px-4 py-6 text-sm text-stone-400 text-center">
            Tippe ein Suchbegriff ein…
          </div>
        </div>
      )}
    </div>
  );
};
