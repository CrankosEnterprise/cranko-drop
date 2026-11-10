import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { HomeView } from './components/home/HomeView';
import { DownloadsView } from './components/downloads/DownloadsView';
import { ConverterView } from './components/converter/ConverterView';
import { LibraryView } from './components/library/LibraryView';
import { SettingsView } from './components/settings/SettingsView';
import { DownloadItem, ConversionTask, LibraryFile, AppSettings, DownloadEngine, ConversionType } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');

  // State
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [conversions, setConversions] = useState<ConversionTask[]>([]);
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
  const [activeEnginesCount, setActiveEnginesCount] = useState<number>(2);
  const [settings, setSettings] = useState<AppSettings>({
    downloadDir: '',
    maxConcurrentDownloads: 3,
    maxDownloadSpeed: 0,
    organizeByType: true,
    organizeByDate: false,
    theme: 'dark',
    notifyOnComplete: true,
    soundOnComplete: true,
    defaultVideoQuality: 'best',
    defaultAudioFormat: 'mp3',
    defaultImageFormat: 'png'
  });

  // Pre-fill state for converter
  const [converterPrefill, setConverterPrefill] = useState<{
    sourcePath?: string;
    format?: string;
    type?: ConversionType;
  }>({});

  // Initial Data Fetch & Subscriptions
  useEffect(() => {
    // 1. Initial loads
    if (window.crankoApi) {
      window.crankoApi.getDownloads().then(setDownloads).catch(console.error);
      window.crankoApi.getConversions().then(setConversions).catch(console.error);
      window.crankoApi.getLibraryFiles().then(setLibraryFiles).catch(console.error);
      window.crankoApi.getSettings().then(setSettings).catch(console.error);
      window.crankoApi.checkBinaries().then((map) => {
        const count = Object.values(map).filter((b: any) => b.available).length + 1; // +1 for Native
        setActiveEnginesCount(count);
      }).catch(console.error);

      // 2. Real-time Download subscriptions
      const unsubProgress = window.crankoApi.onDownloadProgress((updatedItem: DownloadItem) => {
        setDownloads((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      });

      const unsubUpdated = window.crankoApi.onDownloadUpdated((updatedItem: DownloadItem) => {
        setDownloads((prev) => {
          const exists = prev.some((i) => i.id === updatedItem.id);
          if (exists) {
            return prev.map((item) => (item.id === updatedItem.id ? updatedItem : item));
          }
          return [updatedItem, ...prev];
        });
        // If completed, refresh library
        if (updatedItem.status === 'completed') {
          window.crankoApi.getLibraryFiles().then(setLibraryFiles).catch(console.error);
        }
      });

      const unsubAdded = window.crankoApi.onDownloadAdded((newItem: DownloadItem) => {
        setDownloads((prev) => [newItem, ...prev]);
      });

      const unsubRefreshed = window.crankoApi.onDownloadsRefreshed((newItems: DownloadItem[]) => {
        setDownloads(newItems);
      });

      // 3. Conversion subscriptions
      const unsubConvAdded = window.crankoApi.onConversionAdded((newTask: ConversionTask) => {
        setConversions((prev) => [newTask, ...prev]);
      });

      const unsubConvUpdated = window.crankoApi.onConversionUpdated((updatedTask: ConversionTask) => {
        setConversions((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
        if (updatedTask.status === 'completed') {
          window.crankoApi.getLibraryFiles().then(setLibraryFiles).catch(console.error);
        }
      });

      return () => {
        unsubProgress();
        unsubUpdated();
        unsubAdded();
        unsubRefreshed();
        unsubConvAdded();
        unsubConvUpdated();
      };
    }
  }, []);

  // Actions
  const handleStartDownload = async (params: {
    url: string;
    title?: string;
    preferredEngine?: DownloadEngine;
    formatId?: string;
    customFilename?: string;
  }) => {
    await window.crankoApi.addDownload(params);
    setCurrentTab('downloads');
  };

  const handlePauseDownload = async (id: string) => {
    await window.crankoApi.pauseDownload(id);
  };

  const handleResumeDownload = async (id: string) => {
    await window.crankoApi.resumeDownload(id);
  };

  const handleCancelDownload = async (id: string) => {
    await window.crankoApi.cancelDownload(id);
  };

  const handleRetryDownload = async (id: string) => {
    await window.crankoApi.retryDownload(id);
  };

  const handleClearCompleted = async () => {
    await window.crankoApi.clearCompletedDownloads();
  };

  const handleRemoveDownload = async (id: string) => {
    await window.crankoApi.removeDownload(id);
  };

  const handleCreateConversion = async (params: {
    sourcePath: string;
    targetFormat: string;
    type: ConversionType;
    options?: any;
  }) => {
    await window.crankoApi.createConversion(params);
  };

  const handleRefreshLibrary = async () => {
    const files = await window.crankoApi.scanLibrary();
    setLibraryFiles(files);
  };

  const handleUpdateSettings = async (partial: Partial<AppSettings>) => {
    const updated = await window.crankoApi.updateSettings(partial);
    setSettings(updated);
  };

  const handleNavigateToConverterWithFile = (sourcePath: string, suggestedFormat: string, type: ConversionType) => {
    setConverterPrefill({
      sourcePath,
      format: suggestedFormat,
      type
    });
    setCurrentTab('converter');
  };

  const activeDownloadsCount = downloads.filter((d) => d.status === 'downloading' || d.status === 'queued').length;
  const activeConversionsCount = conversions.filter((c) => c.status === 'converting').length;

  return (
    <div className="h-screen w-screen flex flex-col bg-cranko-950 text-slate-100 overflow-hidden">
      {/* Frameless Title Bar with Window Controls */}
      <TitleBar />

      {/* Main Content with Sidebar and Active View */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          activeDownloadsCount={activeDownloadsCount}
          activeConversionsCount={activeConversionsCount}
          activeEnginesCount={activeEnginesCount}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-cranko-950 via-cranko-900/30 to-cranko-950">
          {currentTab === 'home' && (
            <HomeView
              onStartDownload={handleStartDownload}
              onNavigateToConverter={handleNavigateToConverterWithFile}
              recentDownloads={downloads}
            />
          )}

          {currentTab === 'downloads' && (
            <DownloadsView
              downloads={downloads}
              onPause={handlePauseDownload}
              onResume={handleResumeDownload}
              onCancel={handleCancelDownload}
              onRetry={handleRetryDownload}
              onClearCompleted={handleClearCompleted}
              onRemove={handleRemoveDownload}
            />
          )}

          {currentTab === 'converter' && (
            <ConverterView
              conversions={conversions}
              prefilledSourcePath={converterPrefill.sourcePath}
              prefilledFormat={converterPrefill.format}
              prefilledType={converterPrefill.type}
              onCreateConversion={handleCreateConversion}
            />
          )}

          {currentTab === 'library' && (
            <LibraryView
              files={libraryFiles}
              onRefresh={handleRefreshLibrary}
              onSendToConverter={(sourcePath) => {
                const ext = sourcePath.split('.').pop()?.toLowerCase() || '';
                let type: ConversionType = 'image';
                if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'].includes(ext)) type = 'audio';
                else if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) type = 'video';
                handleNavigateToConverterWithFile(sourcePath, 'webp', type);
              }}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}
        </main>
      </div>
    </div>
  );
};
