import EventEmitter from 'node:events';
import { DownloadItem } from '../../../src/types';

export interface EngineProgressEvent {
  downloadedBytes: number;
  totalBytes: number;
  progress: number;
  speed: number; // bytes/sec
  eta: number; // seconds
}

export abstract class BaseEngine extends EventEmitter {
  public abstract start(item: DownloadItem, customFormatId?: string): Promise<string>;
  public abstract pause(itemId: string): Promise<void>;
  public abstract resume(item: DownloadItem): Promise<void>;
  public abstract cancel(itemId: string): Promise<void>;
}
