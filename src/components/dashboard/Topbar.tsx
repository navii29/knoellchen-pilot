"use client";

import Link from "next/link";
import { Bell, ChevronRight, Search, Upload } from "lucide-react";
import { THEME } from "@/lib/theme";

export const Topbar = ({ section }: { section: string }) => (
  <div className="h-14 border-b border-stone-200 bg-white px-6 flex items-center justify-between">
    <div className="flex items-center gap-2 text-sm text-stone-600">
      <span className="text-stone-400">Arbeitsbereich</span>
      <ChevronRight size={12} className="text-stone-300" />
      <span className="font-medium text-stone-900">{section}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          placeholder="Kennzeichen, AZ, Mieter…"
          className="pl-8 pr-3 py-1.5 bg-stone-50 rounded-md text-sm ring-1 ring-stone-200 w-64 outline-none focus:ring-stone-300"
        />
      </div>
      <button className="p-1.5 rounded-md hover:bg-stone-100 text-stone-600">
        <Bell size={15} />
      </button>
      <Link
        href="/dashboard/upload"
        className="inline-flex items-center gap-1.5 text-sm text-white px-3 py-1.5 rounded-md font-medium"
        style={{ background: THEME.primary }}
      >
        <Upload size={13} /> Strafzettel hochladen
      </Link>
    </div>
  </div>
);
