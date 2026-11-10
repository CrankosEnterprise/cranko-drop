import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import { shell } from 'electron';
import { SimpleStore } from '../utils/store';
import { DownloadProvider, ProviderStatus } from '../../src/types';
import { BinaryManager } from './BinaryManager';

export class ProviderManager {
  private static instance: ProviderManager;
  private store: SimpleStore<{ providers: DownloadProvider[] }>;

  private defaultProviders: DownloadProvider[] = [
    {
      id: 'native-engine',
      name: 'Mecanismo Nativo Cranko (Direct Stream)',
      category: 'universal',
      description: 'Mecanismo embutido de alta performance com suporte a conexões simultâneas, retomada de downloads interrompidos e integridade por hash.',
      platforms: ['direct', 'github', 'raw', 'cdn', 'images', 'archives', 'documents'],
      contentTypes: ['image', 'video', 'audio', 'document', 'archive'],
      availableFormats: ['Original (1:1)', 'MIME Stream', 'HTTP Chunked'],
      maxQuality: 'Original 1:1 sem perdas',
      method: 'local_engine',
      status: 'operational',
      lastChecked: Date.now(),
      isEnabled: true,
      pingUrl: 'https://1.1.1.1/cdn-cgi/trace',
      statusMessage: 'Operacional • Motor nativo ativo'
    },
    {
      id: 'ytdlp-engine',
      name: 'yt-dlp & FFmpeg Local Engine',
      category: 'video',
      description: 'Mecanismo local avançado com mesclagem de vídeo e áudio em tempo real via FFmpeg em formato MP4.',
      platforms: ['youtube', 'tiktok', 'instagram', 'twitter', 'vimeo', 'soundcloud', 'facebook', 'reddit'],
      contentTypes: ['video', 'audio'],
      availableFormats: ['MP4', 'WEBM', 'MKV', 'MP3 (320k)', 'M4A', 'FLAC'],
      maxQuality: '4K Ultra HD (2160p) + Mux Áudio',
      method: 'local_engine',
      status: 'operational',
      lastChecked: Date.now(),
      isEnabled: true,
      statusMessage: 'Operacional • Binários yt-dlp e FFmpeg integrados'
    },
    {
      id: 'spotify-official',
      name: 'Spotify Metadados & Web Player',
      category: 'audio',
      description: 'Integração oficial via oEmbed para metadados de músicas, álbuns e artistas, arte de capa em alta definição e busca de mídia alternativa.',
      platforms: ['spotify'],
      contentTypes: ['audio'],
      availableFormats: ['Metadados Oficiais', 'Capa HQ', 'Link Oficial de Reprodução'],
      maxQuality: 'Áudio Licenciado Oficial',
      method: 'official_api',
      status: 'operational',
      lastChecked: Date.now(),
      isEnabled: true,
      pingUrl: 'https://open.spotify.com/oembed?url=https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
      statusMessage: 'Operacional • API oEmbed oficial respondendo'
    },
    {
      id: 'cobalt-tools',
      name: 'Cobalt Tools (Portal Especializado & API)',
      category: 'video',
      description: 'Serviço open-source altamente conceituado para download de mídia social livre de propagandas, rastreadores ou paywalls. Suporta abertura assistida no navegador e instâncias personalizadas.',
      platforms: ['youtube', 'tiktok', 'instagram', 'twitter', 'reddit', 'vimeo', 'soundcloud'],
      contentTypes: ['video', 'audio'],
      availableFormats: ['MP4 (1080p/4K)', 'MP3', 'Opus'],
      maxQuality: '1080p Full HD / 4K UHD',
      method: 'browser_assisted',
      status: 'manual_assisted',
      lastChecked: Date.now(),
      isEnabled: true,
      websiteUrl: 'https://cobalt.tools',
      pingUrl: 'https://cobalt.tools',
      statusMessage: 'Disponível • Portal web sem anúncios com importação guiada'
    },
    {
      id: 'invidious-api',
      name: 'Invidious Open API Mirror',
      category: 'video',
      description: 'Rede federada e alternativa oficial ao YouTube com APIs públicas para consulta de streams diretos de vídeo e áudio.',
      platforms: ['youtube'],
      contentTypes: ['video', 'audio'],
      availableFormats: ['MP4 (720p/1080p)', 'WEBM', 'M4A'],
      maxQuality: '1080p Full HD',
      method: 'official_api',
      status: 'operational',
      lastChecked: Date.now(),
      isEnabled: true,
      pingUrl: 'https://inv.tux.pizza/api/v1/stats',
      statusMessage: 'Operacional • Espelho federado ativo'
    },
    {
      id: 'savefrom-portal',
      name: 'SaveFrom Video Portal',
      category: 'video',
      description: 'Portal web especializado para seleção direta de formatos e download assistido com importação para a biblioteca.',
      platforms: ['youtube', 'facebook', 'vimeo', 'dailymotion'],
      contentTypes: ['video', 'audio'],
      availableFormats: ['MP4 (720p/1080p)', 'MP3'],
      maxQuality: 'Full HD (1080p)',
      method: 'browser_assisted',
      status: 'manual_assisted',
      lastChecked: Date.now(),
      isEnabled: true,
      websiteUrl: 'https://en.savefrom.net',
      pingUrl: 'https://en.savefrom.net',
      statusMessage: 'Disponível • Portal assistido de contingência'
    },
    {
      id: 'gallerydl-engine',
      name: 'gallery-dl Local Engine',
      category: 'image',
      description: 'Mecanismo local para extração e download em lote de álbuns e galerias fotográficas completas.',
      platforms: ['imgur', 'artstation', 'deviantart', 'pinterest', 'flickr'],
      contentTypes: ['image', 'gallery'],
      availableFormats: ['Imagens originais do álbum', 'Metadados'],
      maxQuality: 'Resolução Original sem compressão',
      method: 'local_engine',
      status: 'operational',
      lastChecked: Date.now(),
      isEnabled: true,
      statusMessage: 'Operacional • Binário gallery-dl v1.31.10 integrado'
    },
    {
      id: 'unsplash-images',
      name: 'Unsplash & Imagens Livres',
      category: 'image',
      description: 'Acesso direto a repositórios de imagens em ultra definição com preservação integral de metadados e espaço de cor.',
      platforms: ['unsplash', 'direct_images'],
      contentTypes: ['image'],
      availableFormats: ['JPG', 'PNG', 'WEBP', 'RAW'],
      maxQuality: 'Resolução Nativa da Câmera',
      method: 'official_api',
      status: 'operational',
      lastChecked: Date.now(),
      isEnabled: true,
      pingUrl: 'https://unsplash.com',
      statusMessage: 'Operacional • Conectividade direta de alta resolução'
    }
  ];

  private constructor() {
    this.store = new SimpleStore<{ providers: DownloadProvider[] }>('providers', {
      providers: this.defaultProviders
    });

    // Merge any missing default providers into existing store
    const stored = this.store.get().providers || [];
    let updated = false;
    for (const def of this.defaultProviders) {
      if (!stored.some(p => p.id === def.id)) {
        stored.push(def);
        updated = true;
      }
    }
    if (updated) {
      this.store.replace({ providers: stored });
    }
  }

  public static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  public getAllProviders(): DownloadProvider[] {
    return this.store.get().providers;
  }

  public toggleProvider(id: string, isEnabled: boolean): DownloadProvider[] {
    const list = this.store.get().providers.map(p => {
      if (p.id === id) {
        return { ...p, isEnabled };
      }
      return p;
    });
    this.store.replace({ providers: list });
    return list;
  }

  public updateProvider(id: string, partial: Partial<DownloadProvider>): DownloadProvider[] {
    const list = this.store.get().providers.map(p => {
      if (p.id === id) {
        return { ...p, ...partial };
      }
      return p;
    });
    this.store.replace({ providers: list });
    return list;
  }

  public getCompatibleProviders(urlStr: string, domain: string): DownloadProvider[] {
    const all = this.getAllProviders().filter(p => p.isEnabled);
    const lowerDomain = domain.toLowerCase();

    const matches: DownloadProvider[] = [];

    for (const prov of all) {
      const matchPlatform = prov.platforms.some(plat => {
        if (plat === 'all') return true;
        if (plat === 'direct' && !this.isKnownPlatform(lowerDomain)) return true;
        if (plat === 'youtube' && (lowerDomain.includes('youtube.com') || lowerDomain.includes('youtu.be'))) return true;
        if (plat === 'spotify' && (lowerDomain.includes('spotify.com') || lowerDomain.includes('spotify.link'))) return true;
        if (plat === 'tiktok' && lowerDomain.includes('tiktok.com')) return true;
        if (plat === 'instagram' && lowerDomain.includes('instagram.com')) return true;
        if (plat === 'twitter' && (lowerDomain.includes('twitter.com') || lowerDomain.includes('x.com'))) return true;
        if (plat === 'vimeo' && lowerDomain.includes('vimeo.com')) return true;
        if (plat === 'reddit' && lowerDomain.includes('reddit.com')) return true;
        if (plat === 'soundcloud' && lowerDomain.includes('soundcloud.com')) return true;
        if (plat === 'galleries' && ['imgur.com', 'artstation.com', 'deviantart.com', 'pinterest.com'].some(d => lowerDomain.includes(d))) return true;
        if (plat === 'images' && /\.(png|jpe?g|webp|gif|avif|bmp|tiff|svg)$/i.test(urlStr)) return true;
        return lowerDomain.includes(plat);
      });

      if (matchPlatform) {
        matches.push(prov);
      }
    }

    // Sort: Local engines and official APIs first, browser-assisted portals next
    return matches.sort((a, b) => {
      const order = { local_engine: 0, official_api: 1, custom_api: 2, browser_assisted: 3 };
      return (order[a.method] ?? 9) - (order[b.method] ?? 9);
    });
  }

  public async testProvider(id: string): Promise<DownloadProvider> {
    const list = this.getAllProviders();
    const provider = list.find(p => p.id === id);
    if (!provider) {
      throw new Error(`Provedor não encontrado: ${id}`);
    }

    const binaryMgr = BinaryManager.getInstance();
    const startTime = Date.now();

    try {
      if (provider.id === 'native-engine') {
        const pingTime = await this.pingHttp(provider.pingUrl || 'https://1.1.1.1/cdn-cgi/trace');
        provider.status = 'operational';
        provider.statusMessage = `Operacional • Latência: ${pingTime}ms • Downloader nativo ativo`;
      } else if (provider.id === 'ytdlp-engine') {
        const ytCheck = await binaryMgr.checkBinary('yt-dlp');
        const ffCheck = await binaryMgr.checkBinary('ffmpeg');
        if (ytCheck.available && ffCheck.available) {
          provider.status = 'operational';
          provider.statusMessage = `Operacional • yt-dlp ${ytCheck.version} + FFmpeg integrado`;
        } else if (ytCheck.available) {
          provider.status = 'degraded';
          provider.statusMessage = 'Degradado • yt-dlp disponível, mas FFmpeg não foi localizado';
        } else {
          provider.status = 'offline';
          provider.statusMessage = 'Offline • Executável yt-dlp não localizado';
        }
      } else if (provider.id === 'gallerydl-engine') {
        const gCheck = await binaryMgr.checkBinary('gallery-dl');
        if (gCheck.available) {
          provider.status = 'operational';
          provider.statusMessage = `Operacional • gallery-dl v${gCheck.version}`;
        } else {
          provider.status = 'offline';
          provider.statusMessage = 'Offline • Executável gallery-dl não localizado';
        }
      } else if (provider.pingUrl) {
        const pingTime = await this.pingHttp(provider.pingUrl);
        provider.status = provider.method === 'browser_assisted' ? 'manual_assisted' : 'operational';
        provider.statusMessage = `${provider.method === 'browser_assisted' ? 'Disponível' : 'Operacional'} • Latência: ${pingTime}ms`;
      } else {
        provider.status = 'operational';
        provider.statusMessage = 'Operacional';
      }
    } catch (err: any) {
      provider.status = 'offline';
      provider.statusMessage = `Falha de conexão: ${err?.message || 'Sem resposta'}`;
    }

    provider.lastChecked = Date.now();
    this.store.replace({ providers: list });
    return provider;
  }

  public async testAllProviders(): Promise<DownloadProvider[]> {
    const list = this.getAllProviders();
    const updated: DownloadProvider[] = [];
    for (const p of list) {
      const res = await this.testProvider(p.id);
      updated.push(res);
    }
    return updated;
  }

  public async openInExternalProvider(providerId: string, mediaUrl: string): Promise<string> {
    const provider = this.getAllProviders().find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provedor desconhecido: ${providerId}`);
    }

    let targetUrl = provider.websiteUrl || 'https://cobalt.tools';

    if (provider.id === 'cobalt-tools') {
      targetUrl = `https://cobalt.tools/#${encodeURIComponent(mediaUrl)}`;
    } else if (provider.id === 'savefrom-portal') {
      targetUrl = `https://en.savefrom.net/1-youtube-video-downloader-7/?url=${encodeURIComponent(mediaUrl)}`;
    } else if (provider.id === 'spotify-official') {
      targetUrl = mediaUrl;
    }

    await shell.openExternal(targetUrl);
    return targetUrl;
  }

  private pingHttp(targetUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      try {
        const parsed = new URL(targetUrl);
        const client = parsed.protocol === 'https:' ? https : http;

        const req = client.request(targetUrl, {
          method: 'GET',
          headers: { 'User-Agent': 'CrankoDrop/1.0' },
          timeout: 6000
        }, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) {
            resolve(Date.now() - start);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout de conexão'));
        });
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private isKnownPlatform(domain: string): boolean {
    const platforms = ['youtube.com', 'youtu.be', 'spotify.com', 'tiktok.com', 'instagram.com', 'twitter.com', 'x.com', 'vimeo.com', 'soundcloud.com', 'reddit.com', 'facebook.com', 'imgur.com', 'artstation.com'];
    return platforms.some(p => domain.includes(p));
  }
}
