"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Search, Upload, X } from "lucide-react";
import { SIDEBAR_OPEN_EVENT } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";

export const Topbar = ({ section }: { section?: string }) => {
  const [searchOpen, setSearchOpen] = useState(false);

  const openSidebar = () => {
    window.dispatchEvent(new Event(SIDEBAR_OPEN_EVENT));
  };

  return (
    <div className="h-16 glass-chrome border-x-0 border-t-0 px-4 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={openSidebar}
          className="md:hidden touch-target -ml-2 flex items-center justify-center text-ink-muted hover:text-ink"
          aria-label="Menü öffnen"
        >
          <Menu size={20} />
        </button>
        {section && (
          <span className="font-display font-semibold text-[16px] text-ink truncate">
            {section}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-2.5">
        {/* Desktop search */}
        <div className="relative hidden md:block">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            placeholder="Kennzeichen, AZ, Mieter…"
            className="pl-9 pr-4 h-9 bg-canvas border border-hairline rounded-pill text-[13px] text-ink placeholder:text-ink-muted w-64 outline-none focus:border-signal/40 focus:ring-2 focus:ring-signal/15 focus:bg-paper transition-all"
          />
        </div>

        {/* Mobile search button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="md:hidden touch-target flex items-center justify-center text-ink-muted hover:text-ink"
          aria-label="Suche öffnen"
        >
          <Search size={18} />
        </button>

        <NotificationBell />

        <Link
          href="/dashboard/upload"
          className="touch-target inline-flex items-center justify-center gap-2 text-[13px] px-4 h-9 rounded-pill font-medium bg-signal text-white hover:bg-signal-strong transition-colors shadow-azure"
          aria-label="Strafzettel hochladen"
        >
          <Upload size={14} strokeWidth={2.25} />
          <span className="hidden md:inline">Hochladen</span>
        </Link>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-paper animate-in fade-in">
          <div className="h-16 px-4 flex items-center gap-3 border-b border-hairline">
            <button
              onClick={() => setSearchOpen(false)}
              className="touch-target flex items-center justify-center text-ink-muted hover:text-ink"
              aria-label="Suche schließen"
            >
              <X size={20} />
            </button>
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                autoFocus
                placeholder="Kennzeichen, AZ, Mieter…"
                className="w-full pl-9 pr-4 h-10 bg-canvas border border-hairline rounded-pill text-[15px] text-ink placeholder:text-ink-muted outline-none focus:border-signal/40 focus:ring-2 focus:ring-signal/15 transition-all"
              />
            </div>
          </div>
          <div className="px-4 py-8 text-sm text-ink-muted text-center">
            Tippe einen Suchbegriff ein…
          </div>
        </div>
      )}
    </div>
  );
};
