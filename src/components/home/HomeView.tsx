import React, { useState, useEffect } from 'react';
import { 
  Link as LinkIcon, 
  ArrowRight, 
  UploadCloud, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Music, 
  Video, 
  FileText, 
  Image as ImageIcon,
  Zap,
  FolderOpen,
  ArrowDown,
  Globe,
  ExternalLink,
  FolderInput,
  RefreshCw
} from 'lucide-react';
import { UrlAnalysisResult, DownloadEngine, DownloadItem, DownloadProvider, ExternalDownloadFile } from '../../types';
import { formatBytes, formatDuration, formatDate } from '../../utils/formatters';

interface HomeViewProps {
  onStartDownload: (params: {
    url: string;
    title?: string;
    preferredEngine?: DownloadEngine;
    formatId?: string;
    customFilename?: string;
  }) => Promise<void>;
  onNavigateToConverter: (sourcePath: string, suggestedFormat: string, type: any) => void;
  recentDownloads: DownloadItem[];
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartDownload,
  onNavigateToConverter,
  recentDownloads
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<UrlAnalysisResult | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('best');
  const [selectedEngine, setSelectedEngine] = useState<DownloadEngine>('native');
  
  // YouTube Search for Protected Platforms (Spotify)
  const [ytSearchResults, setYtSearchResults] = useState<{
    title: string;
    channel: string;
    thumbnail: string;
    duration: number;
    url: string;
  }[] | null>(null);
  const [isSearchingYt, setIsSearchingYt] = useState(false);
  const [ytSearchError, setYtSearchError] = useState<string | null>(null);

  // External Import and Windows Downloads state
  const [recentExternalFiles, setRecentExternalFiles] = useState<ExternalDownloadFile[]>([]);
  const [isScanningDownloads, setIsScanningDownloads] = useState(false);
  const [importNotification, setImportNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [openedExternalProvider, setOpenedExternalProvider] = useState<string | null>(null);

  useEffect(() => {
    loadRecentExternalFiles();
  }, []);

  const loadRecentExternalFiles = async () => {
    setIsScanningDownloads(true);
    try {
      const files = await window.crankoApi.scanRecentDownloads(4);
      setRecentExternalFiles(files || []);
    } catch {
      // ignore
    } finally {
      setIsScanningDownloads(false);
    }
  };

  const handleImportFile = async (filePath: string, thenConvert = false) => {
    try {
      const res = await window.crankoApi.importExternalFile(filePath, true);
      setImportNotification({ type: 'success', message: res.message || 'Arquivo importado com sucesso para a biblioteca!' });
      loadRecentExternalFiles();
      if (thenConvert && res.file) {
        onNavigateToConverter(res.file.path, 'mp4', 'video');
      }
    } catch (err: any) {
      setImportNotification({ type: 'error', message: err?.message || 'Falha ao importar arquivo.' });
    }
  };

  const handleSelectFilesFromPC = async () => {
    try {
      const imported = await window.crankoApi.selectExternalFiles();
      if (imported && imported.length > 0) {
        setImportNotification({ type: 'success', message: `${imported.length} arquivo(s) importado(s) com sucesso para a biblioteca!` });
        loadRecentExternalFiles();
      }
    } catch (err: any) {
      setImportNotification({ type: 'error', message: err?.message || 'Falha ao importar arquivos.' });
    }
  };

  const handleOpenExternalProvider = async (providerId: string, name: string) => {
    if (!analysisResult) return;
    try {
      await window.crankoApi.openInExternalProvider(providerId, analysisResult.url);
      setOpenedExternalProvider(name);
      loadRecentExternalFiles();
    } catch (err: any) {
      setAnalysisError(`Não foi possível abrir o provedor externo: ${err?.message}`);
    }
  };

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<{
    name: string;
    path: string;
    size: number;
    ext: string;
    type: 'image' | 'audio' | 'video' | 'document' | 'other';
  } | null>(null);

  // Auto detect clipboard URL on click or mount
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('ftp://'))) {
        setUrlInput(text.trim());
        analyzeUrl(text.trim());
      }
    } catch {
      // clipboard access denied or empty
    }
  };

  const analyzeUrl = async (urlToAnalyze: string) => {
    const target = urlToAnalyze.trim();
    if (!target) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setYtSearchResults(null);
    setYtSearchError(null);

    try {
      const result = await window.crankoApi.analyzeUrl(target);
      setAnalysisResult(result);
      setSelectedEngine(result.recommendedEngine);
      if (result.availableFormats && result.availableFormats.length > 0) {
        setSelectedFormat(result.availableFormats[0].formatId);
      }
      // If Spotify track is identified, auto-trigger contextual YouTube search
      if (result.isProtectedPlatform && result.title) {
        handleSearchYouTubeForSpotify(result.title);
      }
    } catch (err: any) {
      setAnalysisError(err?.message || 'Não foi possível analisar o endereço fornecido.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSearchYouTubeForSpotify = async (queryTitle: string) => {
    setIsSearchingYt(true);
    setYtSearchError(null);
    try {
      const results = await window.crankoApi.searchYouTube(queryTitle);
      if (results && results.length > 0) {
        setYtSearchResults(results);
      } else {
        setYtSearchError('Nenhum resultado correspondente foi encontrado no YouTube.');
      }
    } catch (err: any) {
      setYtSearchError(err?.message || 'Falha ao buscar vídeos no YouTube.');
    } finally {
      setIsSearchingYt(false);
    }
  };

  const handleStartCurrentDownload = async () => {
    if (!analysisResult) return;
    try {
      await onStartDownload({
        url: analysisResult.url,
        title: analysisResult.title,
        preferredEngine: selectedEngine,
        formatId: selectedFormat !== 'best' ? selectedFormat : undefined
      });
      // Clear analysis panel after starting
      setAnalysisResult(null);
      setUrlInput('');
    } catch (err: any) {
      setAnalysisError(err?.message || 'Falha ao iniciar o download.');
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // 1. If dropped a text URL
    const textData = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (textData && (textData.startsWith('http://') || textData.startsWith('https://'))) {
      setUrlInput(textData.trim());
      analyzeUrl(textData.trim());
      return;
    }

    // 2. If dropped files from desktop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const filePath = (file as any).path || file.name;
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      let type: 'image' | 'audio' | 'video' | 'document' | 'other' = 'other';
      if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'tiff'].includes(ext)) type = 'image';
      else if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'].includes(ext)) type = 'audio';
      else if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) type = 'video';
      else if (['pdf', 'txt', 'docx', 'xlsx', 'md'].includes(ext)) type = 'document';

      setDroppedFile({
        name: file.name,
        path: filePath,
        size: file.size,
        ext,
        type
      });
    }
  };

  return (
    <div 
      className={`flex-1 flex flex-col p-6 overflow-y-auto space-y-6 transition-colors duration-200 ${
        isDragging ? 'drop-zone-active' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hero Welcome banner */}
      <div className="relative rounded-2xl overflow-hidden p-6 glass-panel border border-cranko-500/20 shadow-glow-purple">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cranko-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-cranko-500/20 text-cranko-300">
                <Sparkles className="w-4 h-4 text-cranko-300" />
              </span>
              <span className="text-xs font-semibold tracking-wider text-cranko-300 uppercase">
                Hub Inteligente de Downloads & Mídia
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Cole um Link ou Arraste Qualquer Arquivo
            </h1>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              O Cranko Drop identifica instantaneamente o conteúdo, seleciona o melhor mecanismo 
              (yt-dlp, aria2, gallery-dl ou download direto acelerado) e entrega opções imediatas.
            </p>
          </div>

          <button
            onClick={handlePasteClipboard}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-cranko-800/80 hover:bg-cranko-700/80 border border-cranko-600/40 text-slate-200 text-xs font-medium transition-all shadow-subtle-purple shrink-0"
          >
            <LinkIcon className="w-3.5 h-3.5 text-cranko-400" />
            <span>Colar da Área de Transferência</span>
          </button>
        </div>

        {/* Input Bar */}
        <div className="mt-5 relative flex items-center">
          <div className="absolute left-4 text-cranko-400">
            <LinkIcon className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyzeUrl(urlInput)}
            placeholder="Cole aqui uma URL do YouTube, TikTok, galeria de imagens, ou link direto..."
            className="w-full pl-12 pr-32 py-3.5 bg-cranko-950/80 border border-cranko-700/60 focus:border-cranko-400 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cranko-500/30 transition-all font-mono shadow-inner"
          />
          <button
            onClick={() => analyzeUrl(urlInput)}
            disabled={!urlInput.trim() || isAnalyzing}
            className="absolute right-2 px-4 py-2 rounded-lg gradient-accent-button text-white text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow-purple"
          >
            {isAnalyzing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Analisando...</span>
              </>
            ) : (
              <>
                <span>Analisar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {analysisError && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{analysisError}</span>
          </div>
        )}
      </div>

      {/* Analysis Preview Card (If URL inspected) */}
      {analysisResult && (
        <div className="glass-panel rounded-2xl p-5 border border-cranko-500/30 space-y-4 shadow-subtle-purple animate-fadeIn">
          <div className="flex items-center justify-between border-b border-cranko-800/60 pb-3">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${analysisResult.isProtectedPlatform ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}></span>
              <h2 className="text-sm font-bold text-slate-100">
                {analysisResult.isProtectedPlatform ? 'Plataforma com Proteção de Direitos Identificada' : 'Conteúdo Identificado com Sucesso'}
              </h2>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">{analysisResult.isProtectedPlatform ? 'Plataforma:' : 'Mecanismo recomendado:'}</span>
              <span className={`px-2 py-0.5 rounded-full border font-mono font-bold uppercase text-[10px] ${
                analysisResult.isProtectedPlatform 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-cranko-500/20 border-cranko-500/40 text-cranko-300'
              }`}>
                {analysisResult.provider || analysisResult.recommendedEngine}
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-5 items-start">
            {/* Thumbnail */}
            {analysisResult.thumbnailUrl ? (
              <div className="w-full md:w-56 h-36 rounded-xl overflow-hidden bg-cranko-950 border border-cranko-800 shrink-0 relative group">
                <img 
                  src={analysisResult.thumbnailUrl} 
                  alt="Thumbnail" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                {analysisResult.duration && (
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white font-medium">
                    {formatDuration(analysisResult.duration)}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full md:w-56 h-36 rounded-xl bg-cranko-950 border border-cranko-800/80 flex flex-col items-center justify-center text-slate-500 shrink-0">
                <Video className="w-8 h-8 text-cranko-600 mb-1" />
                <span className="text-[11px]">Download Direto</span>
              </div>
            )}

            {/* Info and options */}
            <div className="flex-1 space-y-3 min-w-0 w-full">
              <div>
                <h3 className="text-base font-bold text-white truncate" title={analysisResult.title}>
                  {analysisResult.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono truncate">{analysisResult.url}</p>
                {analysisResult.filesize ? (
                  <p className="text-xs text-cranko-300 font-semibold mt-1">
                    Tamanho aproximado: {formatBytes(analysisResult.filesize)}
                  </p>
                ) : null}
              </div>

              {/* Protected Platform Message (Spotify) */}
              {analysisResult.isProtectedPlatform ? (
                <div className="space-y-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs space-y-1.5 leading-relaxed">
                    <div className="flex items-center space-x-1.5 font-bold text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Conteúdo Protegido por Direitos Autorais / DRM</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {analysisResult.protectionNotice}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {analysisResult.officialUrl && (
                      <a
                        href={analysisResult.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-2 transition-all shadow-subtle-purple"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Ouvir no Spotify Oficial</span>
                      </a>
                    )}

                    <button
                      type="button"
                      disabled={isSearchingYt}
                      onClick={() => handleSearchYouTubeForSpotify(analysisResult.title || '')}
                      className="px-3.5 py-2 rounded-xl bg-cranko-800/80 hover:bg-cranko-700/80 border border-cranko-600/40 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50"
                    >
                      <Video className="w-3.5 h-3.5 text-cranko-400" />
                      <span>{isSearchingYt ? 'Buscando no YouTube...' : 'Buscar versões no YouTube'}</span>
                    </button>
                  </div>

                  {/* YouTube Results for Spotify */}
                  {isSearchingYt && (
                    <div className="p-4 rounded-xl bg-cranko-950/60 border border-cranko-800 text-xs text-slate-400 flex items-center space-x-2">
                      <div className="w-3.5 h-3.5 border-2 border-cranko-400/30 border-t-cranko-400 rounded-full animate-spin"></div>
                      <span>Localizando clipes e versões correspondentes com alta fidelidade no YouTube...</span>
                    </div>
                  )}

                  {ytSearchError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      {ytSearchError}
                    </div>
                  )}

                  {ytSearchResults && ytSearchResults.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Versões Disponíveis no YouTube (Download Autorizado):</span>
                        <span className="text-slate-500 text-[10px] lowercase font-normal">{ytSearchResults.length} opções encontradas</span>
                      </div>
                      <div className="space-y-2">
                        {ytSearchResults.map((vid, idx) => (
                          <div 
                            key={idx}
                            className="p-3 rounded-xl bg-cranko-950/70 border border-cranko-800/80 hover:border-cranko-600/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
                          >
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              {vid.thumbnail ? (
                                <img 
                                  src={vid.thumbnail} 
                                  alt="Thumbnail" 
                                  className="w-16 h-10 rounded-lg object-cover bg-black shrink-0 border border-cranko-800" 
                                />
                              ) : (
                                <div className="w-16 h-10 rounded-lg bg-cranko-900 border border-cranko-800 flex items-center justify-center shrink-0">
                                  <Video className="w-4 h-4 text-cranko-500" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white truncate" title={vid.title}>
                                  {vid.title}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {vid.channel} {vid.duration ? `• ${formatDuration(vid.duration)}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => analyzeUrl(vid.url)}
                                className="px-2 py-1 rounded-lg bg-cranko-800 hover:bg-cranko-700 text-slate-300 text-[11px] font-medium transition-colors"
                                title="Ver todas as resoluções"
                              >
                                Opções
                              </button>
                              <button
                                type="button"
                                onClick={() => onStartDownload({
                                  url: vid.url,
                                  title: vid.title,
                                  preferredEngine: 'yt-dlp',
                                  formatId: 'bestaudio/best'
                                })}
                                className="px-2.5 py-1 rounded-lg bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                                title="Baixar áudio MP3"
                              >
                                <Music className="w-3 h-3" />
                                <span>Áudio MP3</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onStartDownload({
                                  url: vid.url,
                                  title: vid.title,
                                  preferredEngine: 'yt-dlp',
                                  formatId: 'bv*+ba/b'
                                })}
                                className="px-2.5 py-1 rounded-lg gradient-accent-button text-white text-[11px] font-semibold flex items-center space-x-1 shadow-subtle-purple transition-all"
                                title="Baixar vídeo na melhor qualidade"
                              >
                                <ArrowDown className="w-3 h-3" />
                                <span>Vídeo HD</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Formats Selection */}
                  {analysisResult.availableFormats && analysisResult.availableFormats.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Opção de Qualidade & Formato:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {analysisResult.availableFormats.map((fmt) => (
                          <button
                            key={fmt.formatId}
                            type="button"
                            onClick={() => setSelectedFormat(fmt.formatId)}
                            className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                              selectedFormat === fmt.formatId
                                ? 'bg-cranko-500/20 border-cranko-500 text-white shadow-subtle-purple'
                                : 'bg-cranko-950/50 border-cranko-800 text-slate-400 hover:border-cranko-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              {fmt.hasVideo ? <Video className="w-3.5 h-3.5 text-cranko-400" /> : <Music className="w-3.5 h-3.5 text-accent-cyan" />}
                              <span className="font-medium truncate">{fmt.resolution || fmt.extension}</span>
                            </div>
                            {fmt.filesize && (
                              <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                                {formatBytes(fmt.filesize)}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compatible Providers Hub (Opções Especializadas) */}
                  {analysisResult.compatibleProviders && analysisResult.compatibleProviders.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-cranko-800/60">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center space-x-1.5">
                          <Globe className="w-3.5 h-3.5 text-cranko-400" />
                          <span>Provedores Especializados Disponíveis:</span>
                        </span>
                        <span className="text-[10px] text-cranko-300 font-mono font-normal">Hub Inteligente</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {analysisResult.compatibleProviders.map((prov) => (
                          <div 
                            key={prov.id}
                            className="p-2.5 rounded-xl bg-cranko-950/70 border border-cranko-800/80 hover:border-cranko-700 flex items-center justify-between gap-2 transition-all"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{prov.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {prov.method === 'browser_assisted' ? 'Portal Web Sem Anúncios' : 'Download Local Direto'} • {prov.maxQuality}
                              </p>
                            </div>

                            {prov.method === 'browser_assisted' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenExternalProvider(prov.id, prov.name)}
                                className="px-2.5 py-1 rounded-lg bg-cranko-800 hover:bg-cranko-700 text-cranko-200 text-[11px] font-semibold flex items-center space-x-1 transition-colors shrink-0"
                                title="Abrir neste portal no navegador"
                              >
                                <span>Abrir</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                                Integrado
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {openedExternalProvider && (
                        <div className="p-3 rounded-xl bg-cranko-500/10 border border-cranko-500/30 text-xs text-cranko-200 space-y-2 animate-fadeIn">
                          <div className="flex items-center space-x-2">
                            <ExternalLink className="w-4 h-4 text-cranko-400 shrink-0" />
                            <span>
                              O link foi enviado ao <strong>{openedExternalProvider}</strong> no seu navegador. Após concluir o download do arquivo, clique abaixo para importá-lo:
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={loadRecentExternalFiles}
                            className="px-3 py-1.5 rounded-lg bg-cranko-500 hover:bg-cranko-600 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-subtle-purple"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isScanningDownloads ? 'animate-spin' : ''}`} />
                            <span>Localizar Arquivo em Downloads do Windows</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Engine selector and Start button */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <span>Mecanismo:</span>
                      <select
                        value={selectedEngine}
                        onChange={(e) => setSelectedEngine(e.target.value as DownloadEngine)}
                        className="bg-cranko-950 border border-cranko-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cranko-400"
                      >
                        <option value="native">Nativo (Acelerado Direct Stream)</option>
                        <option value="yt-dlp">yt-dlp (Mídias & Playlists)</option>
                        <option value="aria2">aria2 (Multi-conexão Segmentada)</option>
                        <option value="gallery-dl">gallery-dl (Galerias & Álbuns)</option>
                      </select>
                    </div>

                    <div className="flex-1"></div>

                    <button
                      onClick={handleStartCurrentDownload}
                      className="px-5 py-2.5 rounded-xl gradient-accent-button text-white text-xs font-bold flex items-center space-x-2 shadow-glow-purple hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <ArrowDown className="w-4 h-4" />
                      <span>Iniciar Download Agora</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dropped File Action Suggestion Card */}
      {droppedFile && (
        <div className="glass-panel rounded-2xl p-5 border border-accent-cyan/30 space-y-4 shadow-glow-cyan animate-fadeIn">
          <div className="flex items-center justify-between border-b border-cranko-800/60 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan animate-pulse"></span>
              <h2 className="text-sm font-bold text-slate-100">Arquivo Arrastado Detectado</h2>
            </div>
            <button
              onClick={() => setDroppedFile(null)}
              className="text-slate-400 hover:text-white text-xs font-semibold"
            >
              Fechar
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan">
              {droppedFile.type === 'image' && <ImageIcon className="w-6 h-6" />}
              {droppedFile.type === 'audio' && <Music className="w-6 h-6" />}
              {droppedFile.type === 'video' && <Video className="w-6 h-6" />}
              {droppedFile.type === 'document' && <FileText className="w-6 h-6" />}
              {droppedFile.type === 'other' && <FolderOpen className="w-6 h-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white truncate">{droppedFile.name}</h3>
              <p className="text-xs text-slate-400">
                Formato: <span className="uppercase text-cranko-300 font-bold">{droppedFile.ext}</span> • {formatBytes(droppedFile.size)}
              </p>
            </div>
          </div>

          {/* Action pills */}
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Ações recomendadas para este arquivo:
            </div>
            <div className="flex flex-wrap gap-2">
              {droppedFile.type === 'image' && (
                <>
                  <button
                    onClick={() => onNavigateToConverter(droppedFile.path, 'webp', 'image')}
                    className="px-3 py-1.5 rounded-lg bg-cranko-800/80 hover:bg-cranko-700 border border-cranko-600/40 text-xs text-white flex items-center space-x-1.5 transition-all"
                  >
                    <span>Converter para WebP (Mais leve)</span>
                  </button>
                  <button
                    onClick={() => onNavigateToConverter(droppedFile.path, 'jpg', 'image')}
                    className="px-3 py-1.5 rounded-lg bg-cranko-800/80 hover:bg-cranko-700 border border-cranko-600/40 text-xs text-white flex items-center space-x-1.5 transition-all"
                  >
                    <span>Converter para JPG</span>
                  </button>
                  <button
                    onClick={() => onNavigateToConverter(droppedFile.path, 'png', 'image')}
                    className="px-3 py-1.5 rounded-lg bg-cranko-800/80 hover:bg-cranko-700 border border-cranko-600/40 text-xs text-white flex items-center space-x-1.5 transition-all"
                  >
                    <span>Converter para PNG</span>
                  </button>
                  <button
                    onClick={() => onNavigateToConverter(droppedFile.path, 'pdf', 'document')}
                    className="px-3 py-1.5 rounded-lg bg-cranko-800/80 hover:bg-cranko-700 border border-cranko-600/40 text-xs text-white flex items-center space-x-1.5 transition-all"
                  >
                    <span>Salvar Imagem como PDF</span>
                  </button>
                </>
              )}

              {droppedFile.type === 'video' && (
                <>
                  <button
                    onClick={() => onNavigateToConverter(droppedFile.path, 'mp4', 'video')}
                    className="px-3 py-1.5 rounded-lg bg-cranko-800/80 hover:bg-cranko-700 border border-cranko-600/40 text-xs text-white flex items-center space-x-1.5 transition-all"
                  >
                    <span>Converter para MP4 Universal</span>
                  </button>
                  <button
                    onClick={() => onNavigateToConverter(droppedFile.path, 'mp3', 'audio')}
                    className="px-3 py-1.5 rounded-lg bg-cranko-800/80 hover:bg-cranko-700 border border-cranko-600/40 text-xs text-white flex items-center space-x-1.5 transition-all"
                  >
                    <Music className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Extrair Áudio (MP3 320k)</span>
                  </button>
                  <button
                    onClick={() => onNavigateToConverter(droppedFile.path, 'gif', 'video')}
                    className="px-3 py-1.5 rounded-lg bg-cranko-800/80 hover:bg-cranko-700 border border-cranko-600/40 text-xs text-white flex items-center space-x-1.5 transition-all"
                  >
                    <span>Converter para GIF Animado</span>
                  </button>
                </>
              )}

              {droppedFile.type === 'audio' && (
                <>
                  <button
                    onClick={() => onNavigateToConverter(droppedFile.path, 'mp3', 'audio')}
                    className="px-3 py-1.5 rounded-lg bg-cranko-800/80 hover:bg-cranko-700 border border-cranko-600/40 text-xs text-white flex items-center space-x-1.5 transition-all"
                  >
                    <span>Converter para MP3</span>
                  </button>
                  <button
                    onClick={() => onNavigateToConverter(droppedFile.path, 'flac', 'audio')}
                    className="px-3 py-1.5 rounded-lg bg-cranko-800/80 hover:bg-cranko-700 border border-cranko-600/40 text-xs text-white flex items-center space-x-1.5 transition-all"
                  >
                    <span>Converter para FLAC (Sem perda)</span>
                  </button>
                  <button
                    onClick={() => onNavigateToConverter(droppedFile.path, 'wav', 'audio')}
                    className="px-3 py-1.5 rounded-lg bg-cranko-800/80 hover:bg-cranko-700 border border-cranko-600/40 text-xs text-white flex items-center space-x-1.5 transition-all"
                  >
                    <span>Converter para WAV</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Drop Zone Placeholder */}
      <div className="border-2 border-dashed border-cranko-800/80 hover:border-cranko-500/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 transition-colors group bg-cranko-950/40">
        <div className="w-12 h-12 rounded-2xl bg-cranko-900 border border-cranko-800 flex items-center justify-center text-cranko-400 group-hover:scale-110 group-hover:text-cranko-300 transition-all shadow-subtle-purple">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-200">
            Arraste e solte arquivos aqui para conversão instantânea
          </p>
          <p className="text-xs text-slate-500">
            Suporta imagens (PNG, JPG, WebP, AVIF), áudios, vídeos e documentos
          </p>
        </div>
      </div>

      {/* Windows Downloads & External Files Import Card */}
      <div className="glass-panel rounded-2xl p-5 border border-cranko-800/80 space-y-3 shadow-subtle-purple">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cranko-800/60 pb-2.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-cranko-500/20 text-cranko-300">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <span>Importação da Pasta Downloads do Windows</span>
                <span className="text-[10px] text-cranko-400 lowercase font-normal">arquivos externos</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Importe e organize arquivos baixados no navegador ou serviços especializados com validação automática
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSelectFilesFromPC}
              className="px-2.5 py-1.5 rounded-lg bg-cranko-850 hover:bg-cranko-800 border border-cranko-700/60 text-slate-300 text-xs font-semibold flex items-center space-x-1 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cranko-400" />
              <span>Procurar no PC...</span>
            </button>
            <button
              onClick={loadRecentExternalFiles}
              disabled={isScanningDownloads}
              className="p-1.5 rounded-lg bg-cranko-850 hover:bg-cranko-800 text-slate-400 hover:text-white transition-colors"
              title="Atualizar lista de downloads do Windows"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningDownloads ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {importNotification && (
          <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between animate-fadeIn ${
            importNotification.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <span>{importNotification.message}</span>
            <button 
              onClick={() => setImportNotification(null)}
              className="text-slate-400 hover:text-white text-xs font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {recentExternalFiles.length === 0 ? (
          <p className="text-xs text-slate-500 py-2 text-center font-mono">
            Nenhum download recente pendente na pasta de Downloads do Windows.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recentExternalFiles.map((file, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-xl bg-cranko-950/60 border border-cranko-800/80 flex items-center justify-between gap-2 hover:border-cranko-700 transition-all"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-cranko-900 text-cranko-400 shrink-0">
                    {file.category === 'videos' && <Video className="w-3.5 h-3.5" />}
                    {file.category === 'audios' && <Music className="w-3.5 h-3.5" />}
                    {file.category === 'images' && <ImageIcon className="w-3.5 h-3.5" />}
                    {file.category !== 'videos' && file.category !== 'audios' && file.category !== 'images' && <FileText className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate" title={file.name}>{file.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {formatBytes(file.size)} • {file.extension.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={() => handleImportFile(file.path, false)}
                    className="px-2.5 py-1 rounded-lg bg-cranko-800 hover:bg-cranko-700 text-slate-200 text-[11px] font-semibold transition-colors"
                    title="Copiar e registrar na Biblioteca do Cranko Drop"
                  >
                    Importar
                  </button>
                  <button
                    onClick={() => handleImportFile(file.path, true)}
                    className="p-1 rounded-lg bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan transition-colors"
                    title="Importar e enviar ao Conversor"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Recent Downloads Section */}
      {recentDownloads.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Downloads Recentes
            </h3>
            <span className="text-[11px] text-slate-500">
              {recentDownloads.length} item(s) registrado(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentDownloads.slice(0, 4).map((item) => (
              <div 
                key={item.id} 
                className="glass-card glass-card-hover rounded-xl p-3 flex items-center justify-between space-x-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 rounded-lg bg-cranko-800/60 text-cranko-300 shrink-0">
                    {item.category === 'videos' && <Video className="w-4 h-4" />}
                    {item.category === 'audios' && <Music className="w-4 h-4" />}
                    {item.category === 'images' && <ImageIcon className="w-4 h-4" />}
                    {item.category !== 'videos' && item.category !== 'audios' && item.category !== 'images' && <FolderOpen className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate" title={item.filename}>
                      {item.title || item.filename}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {formatBytes(item.fileSize)} • {item.engine}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center space-x-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    item.status === 'completed' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : item.status === 'downloading'
                      ? 'bg-cranko-500/20 text-cranko-300 border border-cranko-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.status === 'completed' ? 'Concluído' : item.status === 'downloading' ? `${item.progress}%` : item.status}
                  </span>

                  {item.status === 'completed' && (
                    <button
                      onClick={() => window.crankoApi.openFile(item.savePath)}
                      className="p-1.5 rounded-lg hover:bg-cranko-800 text-slate-400 hover:text-white transition-colors"
                      title="Abrir arquivo"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
