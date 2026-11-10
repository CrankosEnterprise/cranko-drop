import React, { useState } from 'react';
import { 
  RefreshCw, 
  Image as ImageIcon, 
  Music, 
  Video, 
  FileText, 
  Upload, 
  Settings2, 
  Play, 
  FolderOpen, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Sliders
} from 'lucide-react';
import { ConversionTask, ConversionType } from '../../types';
import { formatBytes, formatDate } from '../../utils/formatters';

interface ConverterViewProps {
  conversions: ConversionTask[];
  prefilledSourcePath?: string;
  prefilledFormat?: string;
  prefilledType?: ConversionType;
  onCreateConversion: (params: {
    sourcePath: string;
    targetFormat: string;
    type: ConversionType;
    options?: any;
  }) => Promise<void>;
}

export const ConverterView: React.FC<ConverterViewProps> = ({
  conversions,
  prefilledSourcePath,
  prefilledFormat,
  prefilledType,
  onCreateConversion
}) => {
  const [activeCategory, setActiveCategory] = useState<ConversionType>(prefilledType || 'image');
  const [sourceFilePath, setSourceFilePath] = useState<string>(prefilledSourcePath || '');
  const [targetFormat, setTargetFormat] = useState<string>(prefilledFormat || 'webp');

  // Image options
  const [imgWidth, setImgWidth] = useState<string>('');
  const [imgHeight, setImgHeight] = useState<string>('');
  const [imgQuality, setImgQuality] = useState<number>(85);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);

  // Audio options
  const [audioBitrate, setAudioBitrate] = useState<string>('320k');

  // Video options
  const [videoResolution, setVideoResolution] = useState<string>('original');
  const [videoCodec, setVideoCodec] = useState<string>('libx264');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatOptions: Record<ConversionType, string[]> = {
    image: ['webp', 'png', 'jpg', 'avif', 'gif', 'bmp', 'tiff', 'ico'],
    audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'],
    video: ['mp4', 'mkv', 'webm', 'mov', 'avi', 'gif'],
    document: ['pdf', 'txt']
  };

  const handleSelectFile = async () => {
    try {
      const filtersMap: Record<ConversionType, { name: string; extensions: string[] }[]> = {
        image: [{ name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'ico'] }],
        audio: [{ name: 'Áudios', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'] }],
        video: [{ name: 'Vídeos', extensions: ['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'wmv'] }],
        document: [{ name: 'Documentos & Imagens', extensions: ['pdf', 'txt', 'png', 'jpg', 'jpeg'] }]
      };

      const path = await window.crankoApi.selectFile(filtersMap[activeCategory]);
      if (path) {
        setSourceFilePath(path);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao selecionar arquivo');
    }
  };

  const handleStartConversion = async () => {
    if (!sourceFilePath) {
      setErrorMsg('Por favor, selecione um arquivo de origem.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const options: any = {};
      if (activeCategory === 'image') {
        if (imgWidth) options.width = parseInt(imgWidth, 10);
        if (imgHeight) options.height = parseInt(imgHeight, 10);
        options.quality = imgQuality;
        options.maintainAspect = maintainAspect;
      } else if (activeCategory === 'audio') {
        options.bitrate = audioBitrate;
      } else if (activeCategory === 'video') {
        options.codec = videoCodec;
        if (videoResolution === '1080p') {
          options.height = 1080;
        } else if (videoResolution === '720p') {
          options.height = 720;
        } else if (videoResolution === '480p') {
          options.height = 480;
        }
      }

      await onCreateConversion({
        sourcePath: sourceFilePath,
        targetFormat,
        type: activeCategory,
        options
      });

      // Clear selection after submit
      setSourceFilePath('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao iniciar conversão');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Category selector pills */}
      <div className="flex items-center space-x-2 border-b border-cranko-800/60 pb-3">
        <button
          onClick={() => { setActiveCategory('image'); setTargetFormat('webp'); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeCategory === 'image'
              ? 'bg-cranko-500 text-white shadow-subtle-purple'
              : 'bg-cranko-900 text-slate-400 hover:text-white border border-cranko-800'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Imagens</span>
        </button>

        <button
          onClick={() => { setActiveCategory('audio'); setTargetFormat('mp3'); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeCategory === 'audio'
              ? 'bg-cranko-500 text-white shadow-subtle-purple'
              : 'bg-cranko-900 text-slate-400 hover:text-white border border-cranko-800'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Áudio</span>
        </button>

        <button
          onClick={() => { setActiveCategory('video'); setTargetFormat('mp4'); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeCategory === 'video'
              ? 'bg-cranko-500 text-white shadow-subtle-purple'
              : 'bg-cranko-900 text-slate-400 hover:text-white border border-cranko-800'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Vídeos</span>
        </button>

        <button
          onClick={() => { setActiveCategory('document'); setTargetFormat('pdf'); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeCategory === 'document'
              ? 'bg-cranko-500 text-white shadow-subtle-purple'
              : 'bg-cranko-900 text-slate-400 hover:text-white border border-cranko-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Documentos</span>
        </button>
      </div>

      {/* Conversion Studio Card */}
      <div className="glass-panel rounded-2xl p-6 border border-cranko-500/20 space-y-5 shadow-subtle-purple">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-cranko-500/10 text-cranko-400">
              <Sliders className="w-4 h-4 text-cranko-300" />
            </span>
            <h2 className="text-base font-bold text-white">Estúdio de Conversão</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Nunca sobrescreve o arquivo original</span>
        </div>

        {/* Source File Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Arquivo de Origem:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={sourceFilePath}
              placeholder="Clique em 'Selecionar' ou arraste um arquivo para a tela inicial..."
              className="flex-1 px-4 py-2.5 bg-cranko-950 border border-cranko-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none font-mono"
            />
            <button
              onClick={handleSelectFile}
              className="px-4 py-2.5 rounded-xl bg-cranko-800 hover:bg-cranko-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-cranko-300" />
              <span>Selecionar Arquivo</span>
            </button>
          </div>
        </div>

        {/* Output Format Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Formato de Saída Desejado:
          </label>
          <div className="flex flex-wrap gap-2">
            {formatOptions[activeCategory].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setTargetFormat(fmt)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                  targetFormat === fmt
                    ? 'bg-cranko-500 text-white shadow-subtle-purple'
                    : 'bg-cranko-950 border border-cranko-800 text-slate-400 hover:border-cranko-700 hover:text-slate-200'
                }`}
              >
                .{fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Specific category fine-tuning */}
        {activeCategory === 'image' && (
          <div className="p-4 rounded-xl bg-cranko-950/60 border border-cranko-800 space-y-3">
            <span className="text-xs font-bold text-cranko-300">Ajustes de Imagem</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400">Largura (px, opcional)</label>
                <input
                  type="number"
                  placeholder="Ex: 1920"
                  value={imgWidth}
                  onChange={(e) => setImgWidth(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-cranko-900 border border-cranko-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cranko-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Altura (px, opcional)</label>
                <input
                  type="number"
                  placeholder="Ex: 1080"
                  value={imgHeight}
                  onChange={(e) => setImgHeight(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-cranko-900 border border-cranko-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cranko-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Qualidade ({imgQuality}%)</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={imgQuality}
                  onChange={(e) => setImgQuality(parseInt(e.target.value, 10))}
                  className="w-full mt-3 accent-cranko-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'audio' && (
          <div className="p-4 rounded-xl bg-cranko-950/60 border border-cranko-800 space-y-3">
            <span className="text-xs font-bold text-cranko-300">Ajustes de Áudio</span>
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-slate-400">Taxa de Bits (Bitrate):</span>
              {['128k', '192k', '256k', '320k'].map((br) => (
                <button
                  key={br}
                  onClick={() => setAudioBitrate(br)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    audioBitrate === br
                      ? 'bg-cranko-500 text-white'
                      : 'bg-cranko-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {br}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'video' && (
          <div className="p-4 rounded-xl bg-cranko-950/60 border border-cranko-800 space-y-3">
            <span className="text-xs font-bold text-cranko-300">Ajustes de Vídeo</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400">Resolução Alvo</label>
                <select
                  value={videoResolution}
                  onChange={(e) => setVideoResolution(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-cranko-900 border border-cranko-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                >
                  <option value="original">Manter Resolução Original</option>
                  <option value="1080p">Full HD (1080p)</option>
                  <option value="720p">HD (720p)</option>
                  <option value="480p">SD (480p - Reduz tamanho)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Codec de Vídeo</label>
                <select
                  value={videoCodec}
                  onChange={(e) => setVideoCodec(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-cranko-900 border border-cranko-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                >
                  <option value="libx264">H.264 (Compatibilidade universal)</option>
                  <option value="libx265">H.265 / HEVC (Alta compressão)</option>
                  <option value="libvpx-vp9">VP9 (Ideal para WebM)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleStartConversion}
            disabled={!sourceFilePath || isSubmitting}
            className="px-6 py-2.5 rounded-xl gradient-accent-button text-white text-xs font-bold flex items-center space-x-2 shadow-glow-purple disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Processando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Iniciar Conversão</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Conversion Queue / History */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Fila e Histórico de Conversões
        </h3>

        {conversions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-cranko-950/40 border border-cranko-800 text-center text-slate-500 text-xs">
            Nenhuma conversão executada ainda. Selecione um arquivo acima para converter.
          </div>
        ) : (
          <div className="space-y-2">
            {conversions.map((task) => (
              <div
                key={task.id}
                className="glass-card rounded-xl p-3 border border-cranko-800 flex items-center justify-between space-x-3 text-xs"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 rounded-lg bg-cranko-950 text-cranko-400 shrink-0">
                    <RefreshCw className={`w-4 h-4 ${task.status === 'converting' ? 'animate-spin text-accent-cyan' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{task.sourceName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {task.sourceExt.toUpperCase()} ➔ {task.targetFormat.toUpperCase()} • {formatBytes(task.sourceSize)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    task.status === 'completed'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : task.status === 'converting'
                      ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30'
                      : 'bg-red-500/15 text-red-400'
                  }`}>
                    {task.status === 'completed' ? 'Concluído' : task.status === 'converting' ? 'Convertendo' : 'Falha'}
                  </span>

                  {task.status === 'completed' && (
                    <>
                      <button
                        onClick={() => window.crankoApi.openFile(task.targetPath)}
                        className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                        title="Abrir convertido"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => window.crankoApi.showInFolder(task.targetPath)}
                        className="p-1.5 rounded-lg bg-cranko-850 hover:bg-cranko-800 text-slate-300"
                        title="Mostrar na pasta"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
