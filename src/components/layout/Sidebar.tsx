import React from 'react';
import { 
  Home, 
  ArrowDownCircle, 
  RefreshCw, 
  FolderSync, 
  Settings, 
  Zap,
  Activity
} from 'lucide-react';

export type NavTab = 'home' | 'downloads' | 'converter' | 'library' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeDownloadsCount: number;
  activeConversionsCount: number;
  activeEnginesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  activeDownloadsCount,
  activeConversionsCount,
  activeEnginesCount = 2
}) => {
  const navItems = [
    {
      id: 'home' as NavTab,
      label: 'Início',
      description: 'Colar link & Drop',
      icon: Home
    },
    {
      id: 'downloads' as NavTab,
      label: 'Downloads',
      description: 'Gerenciador de fila',
      icon: ArrowDownCircle,
      badge: activeDownloadsCount > 0 ? activeDownloadsCount : undefined,
      badgeColor: 'bg-cranko-500 text-white animate-pulse'
    },
    {
      id: 'converter' as NavTab,
      label: 'Conversor',
      description: 'Vídeo, áudio & imagens',
      icon: RefreshCw,
      badge: activeConversionsCount > 0 ? activeConversionsCount : undefined,
      badgeColor: 'bg-accent-cyan text-cranko-950 font-bold'
    },
    {
      id: 'library' as NavTab,
      label: 'Biblioteca',
      description: 'Arquivos organizados',
      icon: FolderSync
    },
    {
      id: 'settings' as NavTab,
      label: 'Configurações',
      description: 'Mecanismos & pastas',
      icon: Settings
    }
  ];

  return (
    <aside className="w-64 bg-cranko-900 border-r border-cranko-800/60 flex flex-col justify-between p-3 select-none shrink-0">
      <div className="space-y-6">
        {/* Navigation list */}
        <nav className="space-y-1.5 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-cranko-600/30 to-cranko-500/10 border border-cranko-500/40 text-slate-100 shadow-subtle-purple'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-cranko-800/40 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`p-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-cranko-500 text-white shadow-glow-purple' 
                      : 'bg-cranko-800/70 text-slate-400 group-hover:text-cranko-300 group-hover:bg-cranko-800'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-semibold truncate leading-tight">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-500 group-hover:text-slate-400 truncate">
                      {item.description}
                    </div>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer status card */}
      <div className="rounded-xl p-3 bg-cranko-950/70 border border-cranko-800/60 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center space-x-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Mecanismos</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {activeEnginesCount} Ativo{activeEnginesCount > 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Nativo e yt-dlp operacionais para download imediato.
        </p>
      </div>
    </aside>
  );
};
