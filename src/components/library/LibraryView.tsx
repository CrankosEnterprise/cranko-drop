import React, { useState } from 'react';
import { 
  FolderSync, 
  Search, 
  Grid, 
  List, 
  Play, 
  FolderOpen, 
  Trash2, 
  Edit3, 
  RefreshCw,
  Video, 
  Music, 
  Image as ImageIcon, 
  FileText, 
  Archive, 
  Package, 
  HelpCircle,
  Clock,
  FolderInput
} from 'lucide-react';
import { LibraryFile, MediaCategory } from '../../types';
import { formatBytes, formatDate, getCategoryLabel } from '../../utils/formatters';

interface LibraryViewProps {
  files: LibraryFile[];
  onRefresh: () => void;
  onSendToConverter: (sourcePath: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  files,
  onRefresh,
  onSendToConverter
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');

  const categories: { id: string; label: string; icon: any }[] = [
    { id: 'all', label: 'Todos', icon: FolderSync },
    { id: 'videos', label: 'Vídeos', icon: Video },
    { id: 'audios', label: 'Áudios', icon: Music },
    { id: 'images', label: 'Imagens', icon: ImageIcon },
    { id: 'documents', label: 'Documentos', icon: FileText },
    { id: 'archives', label: 'Compactados', icon: Archive },
    { id: 'programs', label: 'Programas', icon: Package },
    { id: 'others', label: 'Outros', icon: HelpCircle }
  ];

  const filteredFiles = files.filter((f) => {
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.extension.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleStartRename = (file: LibraryFile) => {
    setRenamingId(file.id);
    setRenameInput(file.name);
  };

  const handleConfirmRename = async (file: LibraryFile) => {
    if (!renameInput.trim() || renameInput === file.name) {
      setRenamingId(null);
      return;
    }
    try {
      await window.crankoApi.renameFile(file.path, renameInput.trim());
      onRefresh();
    } catch (err: any) {
      alert(`Erro ao renomear: ${err?.message}`);
    } finally {
      setRenamingId(null);
    }
  };

  const handleDelete = async (file: LibraryFile) => {
    if (confirm(`Mover "${file.name}" para a Lixeira?`)) {
      try {
        await window.crankoApi.deleteFile(file.path);
        onRefresh();
      } catch (err: any) {
        alert(`Erro ao excluir: ${err?.message}`);
      }
    }
  };

  const handleImportFiles = async () => {
    try {
      const imported = await window.crankoApi.selectExternalFiles();
      if (imported && imported.length > 0) {
        onRefresh();
      }
    } catch (err: any) {
      alert(`Falha ao importar: ${err?.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden space-y-4">
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar arquivos baixados..."
            className="w-full pl-9 pr-4 py-2 bg-cranko-950 border border-cranko-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cranko-400"
          />
        </div>

        {/* View toggle & rescan */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <div className="flex items-center bg-cranko-950 border border-cranko-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-slate-400 transition-colors ${viewMode === 'grid' ? 'bg-cranko-800 text-white' : 'hover:text-slate-200'}`}
              title="Visualização em Grade"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-slate-400 transition-colors ${viewMode === 'list' ? 'bg-cranko-800 text-white' : 'hover:text-slate-200'}`}
              title="Visualização em Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleImportFiles}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-cranko-800 hover:bg-cranko-700 border border-cranko-600/40 text-xs text-white font-medium transition-all shadow-subtle-purple"
            title="Importar arquivos externos do computador para a biblioteca"
          >
            <FolderInput className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Importar Arquivo</span>
          </button>

          <button
            onClick={onRefresh}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-cranko-850 hover:bg-cranko-800 border border-cranko-700/60 text-xs text-slate-300 font-medium transition-all"
            title="Escanear pasta de downloads"
          >
            <FolderSync className="w-3.5 h-3.5 text-cranko-400" />
            <span>Atualizar Pasta</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 shrink-0">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const count = cat.id === 'all' 
            ? files.length 
            : files.filter(f => f.category === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-cranko-500 text-white shadow-subtle-purple'
                  : 'bg-cranko-950 border border-cranko-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span className="text-[10px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Files Content Area */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredFiles.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-2 text-slate-500">
            <FolderOpen className="w-10 h-10 text-cranko-700 stroke-1" />
            <p className="text-sm font-medium">Nenhum arquivo encontrado nesta categoria.</p>
            <p className="text-xs text-slate-600">Baixe conteúdos ou clique em 'Atualizar Pasta'.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="glass-card glass-card-hover rounded-2xl p-4 border border-cranko-800 flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-cranko-950 border border-cranko-800 text-cranko-400 group-hover:text-cranko-300 transition-colors">
                    {file.category === 'videos' && <Video className="w-6 h-6 text-cranko-400" />}
                    {file.category === 'audios' && <Music className="w-6 h-6 text-accent-cyan" />}
                    {file.category === 'images' && <ImageIcon className="w-6 h-6 text-emerald-400" />}
                    {file.category === 'documents' && <FileText className="w-6 h-6 text-amber-400" />}
                    {file.category === 'archives' && <Archive className="w-6 h-6 text-fuchsia-400" />}
                    {file.category === 'programs' && <Package className="w-6 h-6 text-indigo-400" />}
                    {file.category === 'others' && <HelpCircle className="w-6 h-6 text-slate-400" />}
                  </div>

                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-cranko-800/80 text-cranko-300">
                    .{file.extension}
                  </span>
                </div>

                {/* Name */}
                <div className="min-w-0">
                  {renamingId === file.id ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename(file)}
                        className="w-full bg-cranko-950 border border-cranko-400 rounded px-2 py-1 text-xs text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleConfirmRename(file)}
                        className="text-xs text-emerald-400 font-bold px-1"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <h4
                      className="text-xs font-bold text-white truncate cursor-pointer hover:text-cranko-300 transition-colors"
                      title={file.name}
                      onDoubleClick={() => window.crankoApi.openFile(file.path)}
                    >
                      {file.name}
                    </h4>
                  )}
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {formatBytes(file.size)} • {formatDate(file.modifiedAt)}
                  </p>
                </div>

                {/* Action footer */}
                <div className="flex items-center justify-between pt-2 border-t border-cranko-800/60">
                  <button
                    onClick={() => window.crankoApi.openFile(file.path)}
                    className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Abrir</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onSendToConverter(file.path)}
                      className="p-1.5 rounded-lg hover:bg-cranko-800 text-slate-400 hover:text-white transition-colors"
                      title="Converter"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => window.crankoApi.showInFolder(file.path)}
                      className="p-1.5 rounded-lg hover:bg-cranko-800 text-slate-400 hover:text-white transition-colors"
                      title="Mostrar na pasta"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleStartRename(file)}
                      className="p-1.5 rounded-lg hover:bg-cranko-800 text-slate-400 hover:text-white transition-colors"
                      title="Renomear"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      title="Mover para lixeira"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="glass-panel rounded-2xl border border-cranko-800 overflow-hidden divide-y divide-cranko-800/60">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-cranko-900/60 transition-colors gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 rounded-lg bg-cranko-950 text-cranko-400 shrink-0">
                    {file.category === 'videos' && <Video className="w-4 h-4 text-cranko-400" />}
                    {file.category === 'audios' && <Music className="w-4 h-4 text-accent-cyan" />}
                    {file.category === 'images' && <ImageIcon className="w-4 h-4 text-emerald-400" />}
                    {file.category !== 'videos' && file.category !== 'audios' && file.category !== 'images' && <FileText className="w-4 h-4 text-slate-400" />}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {getCategoryLabel(file.category)} • {formatDate(file.modifiedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0">
                  <span className="text-xs font-mono text-slate-400">{formatBytes(file.size)}</span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => window.crankoApi.openFile(file.path)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300"
                      title="Abrir"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSendToConverter(file.path)}
                      className="p-1.5 rounded-lg hover:bg-cranko-800 text-slate-400 hover:text-white"
                      title="Converter"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => window.crankoApi.showInFolder(file.path)}
                      className="p-1.5 rounded-lg hover:bg-cranko-800 text-slate-400 hover:text-white"
                      title="Mostrar na pasta"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
