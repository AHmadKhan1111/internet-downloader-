import React from "react";
import { Download, Sliders, History, ShieldCheck, Zap } from "lucide-react";

interface NavbarProps {
  activeCount: number;
  historyCount: number;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeCount,
  historyCount,
  onOpenSettings,
  onOpenHistory,
}) => {
  return (
    <header
      id="app-header"
      className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-neutral-100 sm:text-lg">
                Universal Link Downloader
              </h1>
              <span className="hidden items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20 sm:inline-flex">
                <ShieldCheck className="h-3 w-3" />
                Unrestricted Proxy
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              Bypass CORS, anti-hotlink & forced-inline viewer restrictions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="btn-open-history"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-700 hover:bg-neutral-800 hover:text-white"
            title="View Download History"
          >
            <History className="h-3.5 w-3.5 text-neutral-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="ml-0.5 rounded-full bg-neutral-800 px-1.5 py-0.2 text-[10px] text-neutral-300">
                {historyCount}
              </span>
            )}
          </button>

          <button
            id="btn-open-settings"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-700 hover:bg-neutral-800 hover:text-white"
            title="Bypass & Headers Configuration"
          >
            <Sliders className="h-3.5 w-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Bypass Settings</span>
          </button>

          {activeCount > 0 && (
            <div
              id="active-downloads-pill"
              className="flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs font-medium text-indigo-300 ring-1 ring-indigo-500/30 animate-pulse"
            >
              <Zap className="h-3.5 w-3.5 text-indigo-400" />
              <span>{activeCount} Active</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
