import { contextBridge, ipcRenderer } from 'electron';
import { DownloadEngine, ConversionType, MediaCategory } from '../../src/types';

export const crankoApi = {
  // URLs & Metadata
  analyzeUrl: (url: string) => ipcRenderer.invoke('url:analyze', url),
  searchYouTube: (query: string) => ipcRenderer.invoke('url:searchYouTube', query),

  // Downloads
  getDownloads: () => ipcRenderer.invoke('downloads:getAll'),
  addDownload: (params: {
    url: string;
    title?: string;
    preferredEngine?: DownloadEngine;
    formatId?: string;
    customFilename?: string;
  }) => ipcRenderer.invoke('downloads:add', params),
  pauseDownload: (id: string) => ipcRenderer.invoke('downloads:pause', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('downloads:resume', id),
  cancelDownload: (id: string) => ipcRenderer.invoke('downloads:cancel', id),
  retryDownload: (id: string) => ipcRenderer.invoke('downloads:retry', id),
  clearCompletedDownloads: () => ipcRenderer.invoke('downloads:clearCompleted'),
  removeDownload: (id: string) => ipcRenderer.invoke('downloads:remove', id),

  // Real-time Event Subscriptions
  onDownloadProgress: (callback: (item: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => { ipcRenderer.removeListener('download-progress', handler); };
  },
  onDownloadUpdated: (callback: (item: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('download-updated', handler);
    return () => { ipcRenderer.removeListener('download-updated', handler); };
  },
  onDownloadAdded: (callback: (item: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('download-added', handler);
    return () => { ipcRenderer.removeListener('download-added', handler); };
  },
  onDownloadsRefreshed: (callback: (items: any[]) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('downloads-refreshed', handler);
    return () => { ipcRenderer.removeListener('downloads-refreshed', handler); };
  },

  // Converter
  getConversions: () => ipcRenderer.invoke('converter:getAll'),
  createConversion: (params: {
    sourcePath: string;
    targetFormat: string;
    type: ConversionType;
    options?: any;
  }) => ipcRenderer.invoke('converter:create', params),
  onConversionAdded: (callback: (task: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('conversion-added', handler);
    return () => { ipcRenderer.removeListener('conversion-added', handler); };
  },
  onConversionUpdated: (callback: (task: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('conversion-updated', handler);
    return () => { ipcRenderer.removeListener('conversion-updated', handler); };
  },

  // Library
  getLibraryFiles: () => ipcRenderer.invoke('library:getAll'),
  scanLibrary: () => ipcRenderer.invoke('library:scan'),
  openFile: (filePath: string) => ipcRenderer.invoke('library:open', filePath),
  showInFolder: (filePath: string) => ipcRenderer.invoke('library:showInFolder', filePath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('library:delete', filePath),
  renameFile: (oldPath: string, newName: string) => ipcRenderer.invoke('library:rename', { oldPath, newName }),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (partial: any) => ipcRenderer.invoke('settings:update', partial),
  selectFolder: () => ipcRenderer.invoke('settings:selectFolder'),
  selectFile: (filters?: any) => ipcRenderer.invoke('settings:selectFile', filters),

  // Binaries
  checkBinaries: () => ipcRenderer.invoke('binaries:checkAll'),
  downloadBinary: (name: 'yt-dlp' | 'gallery-dl') => ipcRenderer.invoke('binaries:download', name),
  onBinaryProgress: (callback: (data: { name: string; progress: number }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('binary-download-progress', handler);
    return () => { ipcRenderer.removeListener('binary-download-progress', handler); };
  },

  // Download Providers Hub
  getProviders: () => ipcRenderer.invoke('providers:getAll'),
  toggleProvider: (id: string, isEnabled: boolean) => ipcRenderer.invoke('providers:toggle', { id, isEnabled }),
  testProvider: (id: string) => ipcRenderer.invoke('providers:test', id),
  testAllProviders: () => ipcRenderer.invoke('providers:testAll'),
  openInExternalProvider: (providerId: string, url: string) => ipcRenderer.invoke('providers:openExternal', { providerId, url }),

  // External File Import
  scanRecentDownloads: (limit?: number) => ipcRenderer.invoke('import:scanRecent', limit),
  importExternalFile: (sourcePath: string, copyToLibraryFolder?: boolean) =>
    ipcRenderer.invoke('import:file', { sourcePath, copyToLibraryFolder }),
  selectExternalFiles: () => ipcRenderer.invoke('import:selectExternalFiles'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
};

contextBridge.exposeInMainWorld('crankoApi', crankoApi);
