import React from 'react';
import { Minus, Square, X, DownloadCloud } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const handleMinimize = () => window.crankoApi?.minimizeWindow();
  const handleMaximize = () => window.crankoApi?.maximizeWindow();
  const handleClose = () => window.crankoApi?.closeWindow();

  return (
    <header className="h-10 bg-cranko-950 border-b border-cranko-800/60 flex items-center justify-between px-3 select-none z-50 shrink-0" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* Brand logo & name */}
      <div className="flex items-center space-x-2.5">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cranko-500 via-cranko-400 to-accent-cyan flex items-center justify-center shadow-subtle-purple">
          <DownloadCloud className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs font-bold tracking-wider text-slate-200">
          CRANKO <span className="text-cranko-300">DROP</span>
        </span>
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-cranko-500/10 border border-cranko-500/30 text-cranko-300 font-medium">
          Hub v1.0
        </span>
      </div>

      {/* Center info */}
      <div className="text-[11px] text-slate-500 hidden sm:block font-medium">
        Universal Download & Conversion Hub
      </div>

      {/* Window Controls */}
      <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={handleMinimize}
          className="w-7 h-7 rounded hover:bg-cranko-800/80 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors"
          title="Minimizar"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 rounded hover:bg-cranko-800/80 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors"
          title="Maximizar / Restaurar"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors"
          title="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
