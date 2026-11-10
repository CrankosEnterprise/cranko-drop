import React, { useState } from 'react';
import { 
  ArrowDownCircle, 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  Trash2, 
  FolderOpen, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Video, 
  Music, 
  Image as ImageIcon, 
  FileText,
  Activity,
  Zap
} from 'lucide-react';
import { DownloadItem, DownloadStatus } from '../../types';
import { formatBytes, formatSpeed, formatDuration } from '../../utils/formatters';

interface DownloadsViewProps {
  downloads: DownloadItem[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onClearCompleted: () => void;
  onRemove: (id: string) => void;
}

export const DownloadsView: React.FC<DownloadsViewProps> = ({
  downloads,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onClearCompleted,
  onRemove
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'downloading' | 'completed' | 'paused' | 'error'>('all');
  const [actionMessage, setActionMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  const handleOpenFile = async (filePath: string) => {
    try {
      setActionMessage(null);
      const res = await window.crankoApi.openFile(filePath);
      if (res && !res.success && res.error) {
        setActionMessage({ type: 'error', text: `Não foi possível abrir o arquivo: ${res.error}` });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Arquivo não encontrado no disco.' });
    }
  };

  const handleShowInFolder = async (filePath: string) => {
    try {
      setActionMessage(null);
      const res = await window.crankoApi.showInFolder(filePath);
      if (res && res.openedDir) {
        setActionMessage({ type: 'info', text: 'O arquivo original foi movido ou renomeado. A pasta de destino foi aberta.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Pasta ou arquivo não localizado no disco.' });
    }
  };

  // Filter downloads
  const filteredDownloads = downloads.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'downloading') return item.status === 'downloading' || item.status === 'queued';
    return item.status === activeTab;
  });

  // Calculate live aggregate stats
  const activeDownloads = downloads.filter(d => d.status === 'downloading');
  const aggregateSpeed = activeDownloads.reduce((acc, curr) => acc + (curr.speed || 0), 0);
  const totalDownloaded = downloads.reduce((acc, curr) => acc + (curr.downloadedBytes || 0), 0);
  const completedCount = downloads.filter(d => d.status === 'completed').length;

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden space-y-5">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <div className="glass-panel rounded-2xl p-4 border border-cranko-500/20 flex items-center space-x-3 shadow-subtle-purple">
          <div className="p-3 rounded-xl bg-cranko-500/10 text-cranko-400">
            <Zap className="w-5 h-5 text-cranko-400 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Velocidade Atual</div>
            <div className="text-xl font-extrabold text-white font-mono">{formatSpeed(aggregateSpeed)}</div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-accent-cyan/20 flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-accent-cyan/10 text-accent-cyan">
            <Activity className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Em Andamento</div>
            <div className="text-xl font-extrabold text-white font-mono">{activeDownloads.length} tarefa(s)</div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/20 flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Concluídos</div>
            <div className="text-xl font-extrabold text-white font-mono">{completedCount} ({formatBytes(totalDownloaded)})</div>
          </div>
        </div>
      </div>

      {/* Tabs and action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-cranko-900 border border-cranko-800/80">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-cranko-500 text-white shadow-subtle-purple'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({downloads.length})
          </button>
          <button
            onClick={() => setActiveTab('downloading')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'downloading'
                ? 'bg-cranko-500 text-white shadow-subtle-purple'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ativos ({activeDownloads.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'completed'
                ? 'bg-cranko-500 text-white shadow-subtle-purple'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Concluídos ({completedCount})
          </button>
          <button
            onClick={() => setActiveTab('paused')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'paused'
                ? 'bg-cranko-500 text-white shadow-subtle-purple'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pausados
          </button>
          <button
            onClick={() => setActiveTab('error')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'error'
                ? 'bg-cranko-500 text-white shadow-subtle-purple'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Erros
          </button>
        </div>

        <button
          onClick={onClearCompleted}
          disabled={completedCount === 0}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cranko-850 hover:bg-cranko-800 border border-cranko-700/60 text-xs text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Limpar Concluídos</span>
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs animate-fadeIn shrink-0 ${
          actionMessage.type === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : 'bg-cranko-500/10 border-cranko-500/30 text-cranko-200'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Downloads List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredDownloads.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-2 text-slate-500">
            <ArrowDownCircle className="w-10 h-10 text-cranko-700 stroke-1" />
            <p className="text-sm font-medium">Nenhum download nesta categoria.</p>
            <p className="text-xs text-slate-600">Cole um link na tela Inicial para começar.</p>
          </div>
        ) : (
          filteredDownloads.map((item) => (
            <div
              key={item.id}
              className="glass-card rounded-2xl p-4 border border-cranko-800/80 hover:border-cranko-600/60 transition-all space-y-3"
            >
              {/* Top row: Title, Engine badge & status */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-cranko-950 border border-cranko-800 text-cranko-400 shrink-0">
                    {item.category === 'videos' && <Video className="w-4 h-4 text-cranko-400" />}
                    {item.category === 'audios' && <Music className="w-4 h-4 text-accent-cyan" />}
                    {item.category === 'images' && <ImageIcon className="w-4 h-4 text-emerald-400" />}
                    {item.category !== 'videos' && item.category !== 'audios' && item.category !== 'images' && <FileText className="w-4 h-4 text-slate-400" />}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate" title={item.filename}>
                      {item.title || item.filename}
                    </h3>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
                      <span className="truncate max-w-[280px]">{item.filename}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 rounded bg-cranko-800/60 text-cranko-300 uppercase font-semibold text-[9px]">
                        {item.engine}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="shrink-0 flex items-center space-x-2">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    item.status === 'downloading'
                      ? 'bg-cranko-500/20 text-cranko-300 border border-cranko-500/30'
                      : item.status === 'completed'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : item.status === 'paused'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : item.status === 'error'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.status === 'downloading' && `${item.progress}%`}
                    {item.status === 'queued' && 'Na Fila'}
                    {item.status === 'completed' && 'Concluído'}
                    {item.status === 'paused' && 'Pausado'}
                    {item.status === 'error' && 'Erro'}
                    {item.status === 'cancelled' && 'Cancelado'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-cranko-950 rounded-full h-2 overflow-hidden border border-cranko-800/50">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    item.status === 'completed'
                      ? 'bg-emerald-500'
                      : item.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-gradient-to-r from-cranko-500 via-cranko-400 to-accent-cyan'
                  }`}
                  style={{ width: `${item.status === 'completed' ? 100 : item.progress}%` }}
                ></div>
              </div>

              {/* Progress stats and buttons */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-3 pt-1">
                <div className="flex items-center space-x-3 font-mono text-[11px]">
                  <span>
                    {formatBytes(item.downloadedBytes)} / {formatBytes(item.fileSize)}
                  </span>
                  {item.status === 'downloading' && (
                    <>
                      <span>•</span>
                      <span className="text-cranko-300 font-semibold">{formatSpeed(item.speed)}</span>
                      {item.eta > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center space-x-1 text-slate-400">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>ETA: {formatDuration(item.eta)}</span>
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                  {item.status === 'downloading' && (
                    <button
                      onClick={() => onPause(item.id)}
                      className="p-1.5 rounded-lg bg-cranko-850 hover:bg-cranko-800 text-slate-300 hover:text-white transition-colors"
                      title="Pausar"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {item.status === 'paused' && (
                    <button
                      onClick={() => onResume(item.id)}
                      className="p-1.5 rounded-lg bg-cranko-500/20 hover:bg-cranko-500/40 text-cranko-300 hover:text-white transition-colors"
                      title="Retomar"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {item.status === 'error' && (
                    <button
                      onClick={() => onRetry(item.id)}
                      className="p-1.5 rounded-lg bg-cranko-500/20 hover:bg-cranko-500/40 text-cranko-300 hover:text-white transition-colors"
                      title="Repetir download"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {item.status === 'completed' && (
                    <>
                      <button
                        onClick={() => handleOpenFile(item.savePath)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-1 transition-colors"
                        title="Abrir arquivo"
                      >
                        <Play className="w-3 h-3" />
                        <span>Abrir</span>
                      </button>
                      <button
                        onClick={() => handleShowInFolder(item.savePath)}
                        className="p-1.5 rounded-lg bg-cranko-850 hover:bg-cranko-800 text-slate-300 hover:text-white transition-colors"
                        title="Mostrar na pasta"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {(item.status === 'downloading' || item.status === 'queued') && (
                    <button
                      onClick={() => onCancel(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      title="Cancelar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-1.5 rounded-lg hover:bg-cranko-800 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Remover da lista"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Error message banner */}
              {item.status === 'error' && item.errorMessage && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.errorMessage}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
