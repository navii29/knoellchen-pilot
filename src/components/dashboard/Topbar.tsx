"use client";

import Link from "next/link";
import { Menu, Upload } from "lucide-react";
import { SIDEBAR_OPEN_EVENT } from "./Sidebar";

export const Topbar = ({ section }: { section?: string }) => {
  const openSidebar = () => {
    window.dispatchEvent(new Event(SIDEBAR_OPEN_EVENT));
  };

  return (
    <div className="h-16 bg-white/70 backdrop-blur-xl border-b border-zinc-200/70 px-4 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={openSidebar}
          className="md:hidden touch-target -ml-2 flex items-center justify-center text-zinc-700 hover:text-zinc-900"
          aria-label="Menü öffnen"
        >
          <Menu size={20} />
        </button>
        <div className="text-[14px] font-medium text-zinc-700 truncate tracking-tight">
          {section ?? ""}
        </div>
      </div>

      <Link
        href="/dashboard/upload"
        className="touch-target inline-flex items-center justify-center gap-2 text-[13.5px] px-4 md:px-5 h-9 rounded-full font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.08)]"
        aria-label="Strafzettel hochladen"
      >
        <Upload size={14} strokeWidth={2.25} />
        <span className="hidden md:inline">Strafzettel hochladen</span>
      </Link>
    </div>
  );
};
