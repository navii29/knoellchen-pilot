"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export const LogoutButton = () => {
  const router = useRouter();
  const onLogout = async () => {
    await fetch("/api/portal/logout", { method: "POST" });
    router.replace("/portal/login");
    router.refresh();
  };
  return (
    <button
      type="button"
      onClick={onLogout}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-paper/40 transition-colors"
    >
      <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
        <LogOut size={16} />
      </div>
      <span className="flex-1 text-[14px] font-medium text-ink">Abmelden</span>
    </button>
  );
};
