import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export class SimpleStore<T extends Record<string, any>> {
  private filePath: string;
  private data: T;

  constructor(filename: string, defaultData: T) {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.filePath = path.join(userDataPath, `${filename}.json`);
    this.data = this.load(defaultData);
  }

  private load(defaultData: T): T {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return { ...defaultData, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.error(`[SimpleStore] Error loading ${this.filePath}:`, err);
    }
    this.save(defaultData);
    return defaultData;
  }

  public get(): T {
    return this.data;
  }

  public set(newData: Partial<T>): T {
    this.data = { ...this.data, ...newData };
    this.save(this.data);
    return this.data;
  }

  public replace(allData: T): T {
    this.data = allData;
    this.save(this.data);
    return this.data;
  }

  private save(data: T): void {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error(`[SimpleStore] Error saving ${this.filePath}:`, err);
    }
  }
}
