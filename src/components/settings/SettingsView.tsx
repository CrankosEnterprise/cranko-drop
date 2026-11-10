import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Folder, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  ShieldCheck, 
  Layers, 
  Moon,
  Zap,
  Sliders,
  PlayCircle,
  Globe,
  ExternalLink,
  Activity,
  Check,
  Radio
} from 'lucide-react';
import { AppSettings, BinaryStatus, DownloadProvider } from '../../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [downloadDir, setDownloadDir] = useState(settings.downloadDir);
  const [maxConcurrent, setMaxConcurrent] = useState(settings.maxConcurrentDownloads);
  const [organizeByType, setOrganizeByType] = useState(settings.organizeByType);

  const [binaries, setBinaries] = useState<Record<string, BinaryStatus>>({});
  const [isCheckingBinaries, setIsCheckingBinaries] = useState(false);
  const [downloadingBinary, setDownloadingBinary] = useState<string | null>(null);
  const [binaryProgress, setBinaryProgress] = useState<number>(0);
  const [testResult, setTestResult] = useState<{ name: string; message: string; success: boolean } | null>(null);

  // Download Providers state
  const [providers, setProviders] = useState<DownloadProvider[]>([]);
  const [isTestingProviders, setIsTestingProviders] = useState(false);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);

  useEffect(() => {
    checkAllBinaries();
    loadProviders();

    // Subscribe to binary download progress
    const unsubscribe = window.crankoApi.onBinaryProgress(({ name, progress }) => {
      setDownloadingBinary(name);
      setBinaryProgress(progress);
      if (progress >= 100) {
        setTimeout(() => {
          setDownloadingBinary(null);
          checkAllBinaries();
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadProviders = async () => {
    try {
      const list = await window.crankoApi.getProviders();
      setProviders(list || []);
    } catch (e) {
      console.error('Falha ao carregar provedores:', e);
    }
  };

  const handleToggleProvider = async (id: string, isEnabled: boolean) => {
    try {
      const updated = await window.crankoApi.toggleProvider(id, isEnabled);
      setProviders(updated);
    } catch (e) {
      console.error('Falha ao alternar provedor:', e);
    }
  };

  const handleTestProvider = async (id: string) => {
    setTestingProviderId(id);
    try {
      const updated = await window.crankoApi.testProvider(id);
      setProviders(prev => prev.map(p => p.id === id ? updated : p));
    } catch (e) {
      console.error('Falha ao testar provedor:', e);
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleTestAllProviders = async () => {
    setIsTestingProviders(true);
    try {
      const updatedList = await window.crankoApi.testAllProviders();
      setProviders(updatedList);
    } catch (e) {
      console.error('Falha ao testar todos os provedores:', e);
    } finally {
      setIsTestingProviders(false);
    }
  };

  const checkAllBinaries = async () => {
    setIsCheckingBinaries(true);
    try {
      const statusMap = await window.crankoApi.checkBinaries();
      setBinaries(statusMap);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingBinaries(false);
    }
  };

  const handleTestBinary = async (name: 'yt-dlp' | 'ffmpeg' | 'ffprobe' | 'aria2c' | 'gallery-dl') => {
    try {
      const statusMap = await window.crankoApi.checkBinaries();
      const st = statusMap[name];
      if (st && st.available) {
        setTestResult({
          name,
          message: `Teste bem-sucedido! Versão detectada: ${st.version || 'OK'} no caminho: ${st.path}`,
          success: true
        });
      } else {
        setTestResult({
          name,
          message: `O mecanismo '${name}' não foi localizado no sistema nem na pasta de recursos.`,
          success: false
        });
      }
    } catch (err: any) {
      setTestResult({
        name,
        message: `Erro durante teste de '${name}': ${err?.message}`,
        success: false
      });
    }
  };

  const handleSelectFolder = async () => {
    const selected = await window.crankoApi.selectFolder();
    if (selected) {
      setDownloadDir(selected);
      await onUpdateSettings({ downloadDir: selected });
    }
  };

  const handleSaveConcurrent = async (val: number) => {
    setMaxConcurrent(val);
    await onUpdateSettings({ maxConcurrentDownloads: val });
  };

  const handleToggleOrganize = async (val: boolean) => {
    setOrganizeByType(val);
    await onUpdateSettings({ organizeByType: val });
  };

  const handleDownloadBinary = async (name: 'yt-dlp' | 'gallery-dl') => {
    setDownloadingBinary(name);
    setBinaryProgress(0);
    try {
      const success = await window.crankoApi.downloadBinary(name);
      if (!success) {
        alert(`Não foi possível baixar '${name}'. Verifique sua conexão com a internet.`);
      }
    } catch (err: any) {
      alert(`Falha no download da ferramenta: ${err?.message}`);
    } finally {
      setDownloadingBinary(null);
      checkAllBinaries();
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-cranko-800/60 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-cranko-500/10 text-cranko-300">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Configurações do Sistema</h2>
            <p className="text-xs text-slate-400">Preferências de armazenamento, mecanismos e downloads</p>
          </div>
        </div>
      </div>

      {/* Storage Settings Card */}
      <div className="glass-panel rounded-2xl p-5 border border-cranko-800/80 space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <Folder className="w-4 h-4 text-cranko-400" />
          <span>Armazenamento & Pastas de Download</span>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Pasta Padrão de Downloads:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={downloadDir}
              className="flex-1 px-4 py-2 bg-cranko-950 border border-cranko-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none"
            />
            <button
              onClick={handleSelectFolder}
              className="px-4 py-2 rounded-xl bg-cranko-800 hover:bg-cranko-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Folder className="w-3.5 h-3.5 text-cranko-300" />
              <span>Procurar...</span>
            </button>
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center space-x-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={organizeByType}
              onChange={(e) => handleToggleOrganize(e.target.checked)}
              className="w-4 h-4 accent-cranko-500 rounded bg-cranko-950 border-cranko-700"
            />
            <div>
              <p className="text-xs font-semibold text-white">Organização inteligente em subpastas</p>
              <p className="text-[11px] text-slate-500">
                Cria e separa automaticamente pastas para Vídeos, Áudios, Imagens, Documentos e Programas.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Download Queues & Performance Card */}
      <div className="glass-panel rounded-2xl p-5 border border-cranko-800/80 space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <Zap className="w-4 h-4 text-cranko-400" />
          <span>Fila & Desempenho</span>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Downloads Simultâneos Máximos: ({maxConcurrent})
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="1"
              max="10"
              value={maxConcurrent}
              onChange={(e) => handleSaveConcurrent(parseInt(e.target.value, 10))}
              className="flex-1 accent-cranko-500"
            />
            <span className="font-mono text-sm text-cranko-300 font-bold px-3 py-1 rounded bg-cranko-950 border border-cranko-800">
              {maxConcurrent}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Define quantas tarefas de download são executadas em paralelo simultaneamente.
          </p>
        </div>
      </div>

      {/* Download Providers Hub (Novo Hub de Provedores Modulares) */}
      <div className="glass-panel rounded-2xl p-5 border border-cranko-500/30 space-y-4 shadow-subtle-purple">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cranko-800/60 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-cranko-500/20 text-cranko-300">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Provedores de Download</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cranko-500/20 text-cranko-300 border border-cranko-500/40">
                  Hub Inteligente
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Gerencie os serviços especializados, APIs oficiais e portais de mídia compatíveis.
              </p>
            </div>
          </div>

          <button
            onClick={handleTestAllProviders}
            disabled={isTestingProviders}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cranko-800/80 hover:bg-cranko-700/80 border border-cranko-600/40 text-xs text-slate-200 font-semibold transition-all shadow-subtle-purple shrink-0 disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 text-cranko-400 ${isTestingProviders ? 'animate-spin' : ''}`} />
            <span>{isTestingProviders ? 'Testando Conexões...' : 'Testar Todos os Provedores'}</span>
          </button>
        </div>

        {/* Providers List */}
        <div className="space-y-3">
          {providers.map((prov) => {
            const isTestingThis = testingProviderId === prov.id;
            const timeSinceCheck = Math.max(1, Math.round((Date.now() - prov.lastChecked) / 60000));

            return (
              <div 
                key={prov.id}
                className={`p-4 rounded-xl border transition-all ${
                  prov.isEnabled 
                    ? 'bg-cranko-950/70 border-cranko-800/90 hover:border-cranko-700' 
                    : 'bg-cranko-950/30 border-cranko-900/60 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{prov.name}</h4>

                      {/* Method Badge */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        prov.method === 'local_engine'
                          ? 'bg-cranko-500/10 border-cranko-500/30 text-cranko-300'
                          : prov.method === 'official_api'
                          ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}>
                        {prov.method === 'local_engine' && 'Motor Local'}
                        {prov.method === 'official_api' && 'API Oficial'}
                        {prov.method === 'browser_assisted' && 'Portal Assistido Web'}
                        {prov.method === 'custom_api' && 'Instância API'}
                      </span>

                      {/* Status Badge */}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        prov.status === 'operational'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : prov.status === 'manual_assisted'
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                          : prov.status === 'degraded'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-400'
                      }`}>
                        {prov.status === 'operational' && 'Operacional'}
                        {prov.status === 'manual_assisted' && 'Assistido'}
                        {prov.status === 'degraded' && 'Degradado'}
                        {prov.status === 'offline' && 'Offline'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {prov.description}
                    </p>

                    {/* Meta info: Platforms & Qualities */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Plataformas:</span>
                      {prov.platforms.map((p, i) => (
                        <span key={i} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cranko-900 border border-cranko-800 text-slate-300">
                          {p}
                        </span>
                      ))}
                      <span className="text-slate-600 text-xs">•</span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Qualidade Máx: <span className="text-white font-mono">{prov.maxQuality}</span>
                      </span>
                    </div>

                    {/* Status message & last checked */}
                    <div className="text-[10px] text-slate-500 flex items-center space-x-2 pt-0.5">
                      <span>{prov.statusMessage || 'Aguardando verificação'}</span>
                      <span>•</span>
                      <span>Verificado há {timeSinceCheck} min</span>
                    </div>
                  </div>

                  {/* Actions & Toggle */}
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleTestProvider(prov.id)}
                      disabled={isTestingThis}
                      className="px-2.5 py-1.5 rounded-lg bg-cranko-850 hover:bg-cranko-800 border border-cranko-700/60 text-[11px] text-slate-300 font-medium transition-colors flex items-center space-x-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTestingThis ? 'animate-spin text-cranko-400' : 'text-slate-400'}`} />
                      <span>{isTestingThis ? 'Testando...' : 'Testar Conexão'}</span>
                    </button>

                    {/* Enable/Disable Toggle */}
                    <button
                      onClick={() => handleToggleProvider(prov.id, !prov.isEnabled)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                        prov.isEnabled
                          ? 'bg-cranko-500/20 border-cranko-500/50 text-cranko-200 hover:bg-cranko-500/30'
                          : 'bg-cranko-900 border-cranko-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {prov.isEnabled ? 'Ativado' : 'Desativado'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* External Engines & Binaries Manager */}
      <div className="glass-panel rounded-2xl p-5 border border-cranko-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <Cpu className="w-4 h-4 text-cranko-400" />
            <span>Mecanismos & Ferramentas Integradas</span>
          </div>
          <button
            onClick={checkAllBinaries}
            disabled={isCheckingBinaries}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cranko-800 hover:bg-cranko-700 text-xs text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingBinaries ? 'animate-spin' : ''}`} />
            <span>Verificar Ferramentas</span>
          </button>
        </div>

        {testResult && (
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex items-center space-x-2 truncate">
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />}
              <span className="truncate">{testResult.message}</span>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="text-[10px] uppercase font-bold text-slate-400 hover:text-white px-2"
            >
              Fechar
            </button>
          </div>
        )}

        <div className="space-y-3">
          {/* Native HTTP */}
          <div className="p-3.5 rounded-xl bg-cranko-950/60 border border-cranko-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Motor Nativo Resiliente (Node.js Direct Stream)</p>
                <p className="text-[11px] text-slate-400">Embutido nativamente no aplicativo • Suporte a Range requests & chunks com validação MIME</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Integrado
            </span>
          </div>

          {/* yt-dlp */}
          <div className="p-3.5 rounded-xl bg-cranko-950/60 border border-cranko-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              {binaries['yt-dlp']?.available ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-xs font-bold text-white">yt-dlp (Mídias, Vídeos & Playlists)</p>
                  {binaries['yt-dlp']?.version && (
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">({binaries['yt-dlp'].version})</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {binaries['yt-dlp']?.available 
                    ? `Pronto e operacional em: ${binaries['yt-dlp'].path}` 
                    : 'Mecanismo não localizado. Clique em Baixar Oficial para instalar.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
              {binaries['yt-dlp']?.available && (
                <button
                  onClick={() => handleTestBinary('yt-dlp')}
                  className="px-2.5 py-1 rounded-lg bg-cranko-850 hover:bg-cranko-800 text-[11px] text-slate-300 font-medium transition-colors"
                  title="Testar funcionamento agora"
                >
                  Testar
                </button>
              )}

              {downloadingBinary === 'yt-dlp' ? (
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-cranko-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-cranko-500 h-full" style={{ width: `${binaryProgress}%` }}></div>
                  </div>
                  <span className="text-[10px] font-mono text-cranko-300">{binaryProgress}%</span>
                </div>
              ) : !binaries['yt-dlp']?.available ? (
                <button
                  onClick={() => handleDownloadBinary('yt-dlp')}
                  className="px-3 py-1 rounded-lg bg-cranko-500 hover:bg-cranko-600 text-white text-xs font-semibold flex items-center space-x-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Baixar Oficial</span>
                </button>
              ) : (
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Ativo
                </span>
              )}
            </div>
          </div>

          {/* FFmpeg */}
          <div className="p-3.5 rounded-xl bg-cranko-950/60 border border-cranko-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              {binaries['ffmpeg']?.available ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-slate-500 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-xs font-bold text-white">FFmpeg & FFprobe (Conversão Universal)</p>
                  {binaries['ffmpeg']?.version && (
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">({binaries['ffmpeg'].version.slice(0, 30)})</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {binaries['ffmpeg']?.available 
                    ? `Disponível em: ${binaries['ffmpeg'].path}` 
                    : 'Não detectado no sistema. Necessário para conversões avançadas de áudio e vídeo.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
              {binaries['ffmpeg']?.available ? (
                <>
                  <button
                    onClick={() => handleTestBinary('ffmpeg')}
                    className="px-2.5 py-1 rounded-lg bg-cranko-850 hover:bg-cranko-800 text-[11px] text-slate-300 font-medium"
                  >
                    Testar
                  </button>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Ativo
                  </span>
                </>
              ) : (
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                  Opcional
                </span>
              )}
            </div>
          </div>

          {/* aria2 */}
          <div className="p-3.5 rounded-xl bg-cranko-950/60 border border-cranko-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              {binaries['aria2c']?.available ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-slate-500 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">aria2c (Aceleração Multi-segmento)</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {binaries['aria2c']?.available
                    ? `Disponível em: ${binaries['aria2c'].path}`
                    : 'Não instalado no sistema. O motor nativo é utilizado automaticamente como fallback com alta velocidade.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
              {binaries['aria2c']?.available ? (
                <>
                  <button
                    onClick={() => handleTestBinary('aria2c')}
                    className="px-2.5 py-1 rounded-lg bg-cranko-850 hover:bg-cranko-800 text-[11px] text-slate-300 font-medium"
                  >
                    Testar
                  </button>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Ativo
                  </span>
                </>
              ) : (
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                  Opcional
                </span>
              )}
            </div>
          </div>

          {/* gallery-dl */}
          <div className="p-3.5 rounded-xl bg-cranko-950/60 border border-cranko-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              {binaries['gallery-dl']?.available ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-slate-500 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">gallery-dl (Galerias & Coleções de Imagens)</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {binaries['gallery-dl']?.available
                    ? `Disponível em: ${binaries['gallery-dl'].path}`
                    : 'Mecanismo opcional para download de galerias de sites de arte.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
              {binaries['gallery-dl']?.available ? (
                <>
                  <button
                    onClick={() => handleTestBinary('gallery-dl')}
                    className="px-2.5 py-1 rounded-lg bg-cranko-850 hover:bg-cranko-800 text-[11px] text-slate-300 font-medium"
                  >
                    Testar
                  </button>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Ativo
                  </span>
                </>
              ) : (
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                  Opcional
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Identity & Security */}
      <div className="glass-panel rounded-2xl p-5 border border-cranko-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cranko-500/10 text-cranko-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Segurança & Privacidade</p>
            <p className="text-[11px] text-slate-400">
              Arquivos baixados nunca são auto-executados. Armazenamento 100% local e seguro no seu dispositivo.
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-semibold">Tema Dark Violet Padrão</span>
      </div>
    </div>
  );
};
