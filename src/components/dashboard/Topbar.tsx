"use client";

import Link from "next/link";
import { Bell, Search, Upload } from "lucide-react";

export const Topbar = ({ section }: { section?: string }) => (
  <div className="h-14 bg-white border-b border-stone-100 px-6 flex items-center justify-between gap-2">
    <div className="text-sm font-medium text-stone-700 truncate">{section ?? ""}</div>
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-300" />
        <input
          placeholder="Kennzeichen, AZ, Mieter…"
          className="pl-8 pr-3 py-1.5 bg-stone-50 rounded-md text-sm border border-transparent placeholder:text-stone-400 w-64 outline-none focus:bg-white focus:border-stone-200 transition-colors"
        />
      </div>
      <button className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors">
        <Bell size={15} />
      </button>
      <Link
        href="/dashboard/upload"
        className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium border border-teal-500 text-teal-700 bg-transparent hover:bg-teal-50 transition-colors"
      >
        <Upload size={13} /> Strafzettel hochladen
      </Link>
    </div>
  </div>
);
