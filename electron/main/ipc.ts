import { ipcMain, dialog, BrowserWindow } from 'electron';
import { UrlAnalyzer } from './services/UrlAnalyzer';
import { DownloadManager } from './services/DownloadManager';
import { ConversionService } from './services/ConversionService';
import { LibraryService } from './services/LibraryService';
import { SettingsService } from './services/SettingsService';
import { BinaryManager } from './services/BinaryManager';
import { ProviderManager } from './services/ProviderManager';
import { ExternalImportService } from './services/ExternalImportService';

export function registerIpcHandlers(): void {
  const urlAnalyzer = UrlAnalyzer.getInstance();
  const downloadManager = DownloadManager.getInstance();
  const conversionService = ConversionService.getInstance();
  const libraryService = LibraryService.getInstance();
  const settingsService = SettingsService.getInstance();
  const binaryManager = BinaryManager.getInstance();
  const providerManager = ProviderManager.getInstance();
  const externalImportService = ExternalImportService.getInstance();

  // URL Analyzer
  ipcMain.handle('url:analyze', async (_, url: string) => {
    return await urlAnalyzer.analyzeUrl(url);
  });

  ipcMain.handle('url:searchYouTube', async (_, query: string) => {
    return await urlAnalyzer.searchYouTube(query);
  });

  // Downloads
  ipcMain.handle('downloads:getAll', () => {
    return downloadManager.getAll();
  });

  ipcMain.handle('downloads:add', async (_, { url, title, preferredEngine, formatId, customFilename }) => {
    return await downloadManager.addDownload(url, title, preferredEngine, formatId, customFilename);
  });

  ipcMain.handle('downloads:pause', async (_, id: string) => {
    return await downloadManager.pauseDownload(id);
  });

  ipcMain.handle('downloads:resume', async (_, id: string) => {
    return await downloadManager.resumeDownload(id);
  });

  ipcMain.handle('downloads:cancel', async (_, id: string) => {
    return await downloadManager.cancelDownload(id);
  });

  ipcMain.handle('downloads:retry', async (_, id: string) => {
    return await downloadManager.retryDownload(id);
  });

  ipcMain.handle('downloads:clearCompleted', () => {
    downloadManager.clearCompleted();
    return true;
  });

  ipcMain.handle('downloads:remove', (_, id: string) => {
    downloadManager.removeDownload(id);
    return true;
  });

  // Converter
  ipcMain.handle('converter:getAll', () => {
    return conversionService.getAll();
  });

  ipcMain.handle('converter:create', async (_, { sourcePath, targetFormat, type, options }) => {
    return await conversionService.createTask(sourcePath, targetFormat, type, options);
  });

  // Library
  ipcMain.handle('library:getAll', () => {
    return libraryService.getAll();
  });

  ipcMain.handle('library:scan', () => {
    return libraryService.scanDownloadsFolder();
  });

  ipcMain.handle('library:open', async (_, filePath: string) => {
    return await libraryService.openFile(filePath);
  });

  ipcMain.handle('library:showInFolder', async (_, filePath: string) => {
    return await libraryService.showInFolder(filePath);
  });

  ipcMain.handle('library:delete', async (_, filePath: string) => {
    return await libraryService.deleteFile(filePath);
  });

  ipcMain.handle('library:rename', (_, { oldPath, newName }) => {
    return libraryService.renameFile(oldPath, newName);
  });

  // Settings
  ipcMain.handle('settings:get', () => {
    return settingsService.getSettings();
  });

  ipcMain.handle('settings:update', (_, partial) => {
    return settingsService.updateSettings(partial);
  });

  ipcMain.handle('settings:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Selecione a pasta padrão de downloads'
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('settings:selectFile', async (_, filters) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Selecione um arquivo',
      filters: filters || []
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // Binaries
  ipcMain.handle('binaries:checkAll', async () => {
    return await binaryManager.checkAllBinaries();
  });

  ipcMain.handle('binaries:download', async (event, name: 'yt-dlp' | 'gallery-dl') => {
    return await binaryManager.downloadBinary(name, (progress) => {
      event.sender.send('binary-download-progress', { name, progress });
    });
  });

  // Providers
  ipcMain.handle('providers:getAll', () => {
    return providerManager.getAllProviders();
  });

  ipcMain.handle('providers:toggle', (_, { id, isEnabled }: { id: string; isEnabled: boolean }) => {
    return providerManager.toggleProvider(id, isEnabled);
  });

  ipcMain.handle('providers:test', async (_, id: string) => {
    return await providerManager.testProvider(id);
  });

  ipcMain.handle('providers:testAll', async () => {
    return await providerManager.testAllProviders();
  });

  ipcMain.handle('providers:openExternal', async (_, { providerId, url }: { providerId: string; url: string }) => {
    return await providerManager.openInExternalProvider(providerId, url);
  });

  // External Import
  ipcMain.handle('import:scanRecent', (_, limit?: number) => {
    return externalImportService.scanRecentDownloads(limit);
  });

  ipcMain.handle('import:file', async (_, { sourcePath, copyToLibraryFolder }: { sourcePath: string; copyToLibraryFolder?: boolean }) => {
    return await externalImportService.importFile(sourcePath, { copyToLibraryFolder });
  });

  ipcMain.handle('import:selectExternalFiles', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      title: 'Selecione arquivos para importar para o Cranko Drop'
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const imported: any[] = [];
      for (const p of result.filePaths) {
        try {
          const res = await externalImportService.importFile(p, { copyToLibraryFolder: true });
          imported.push(res);
        } catch (e: any) {
          console.error('[import:selectExternalFiles] Erro ao importar:', e?.message);
        }
      }
      return imported;
    }
    return [];
  });

  // Window Controls
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });
}
