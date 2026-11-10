import { app } from 'electron';
import path from 'node:path';
import { SimpleStore } from '../utils/store';
import { AppSettings } from '../../src/types';

export class SettingsService {
  private static instance: SettingsService;
  private store: SimpleStore<AppSettings>;

  private constructor() {
    const defaultDownloads = app.getPath('downloads') || path.join(app.getPath('home'), 'Downloads');
    const defaults: AppSettings = {
      downloadDir: path.join(defaultDownloads, 'CrankoDrop'),
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
    };

    this.store = new SimpleStore<AppSettings>('settings', defaults);
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  public getSettings(): AppSettings {
    return this.store.get();
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    return this.store.set(partial);
  }
}
