interface Settings {
  apiKey?: string;
  filterEnabled?: boolean;
  customPrompt?: string;
  selectedModel?: string;
  animatedGradientEnabled?: boolean;
  aiIntensity?: string;
}

interface Cache {
  hiddenTitles?: string[];
  [key: string]: any; // For dynamic cache keys like 'v2ex-filter-cache:topicTitle'
}

class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  public async getSettings(): Promise<Settings> {
    return new Promise((resolve) => {
      chrome.storage.sync.get('settings', (result) => {
        resolve(result.settings || {});
      });
    });
  }

  public async setSettings(settings: Settings): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ settings }, () => {
        resolve();
      });
    });
  }

  public async getCache(): Promise<Cache> {
    return new Promise((resolve) => {
      chrome.storage.local.get('cache', (result) => {
        resolve(result.cache || {});
      });
    });
  }

  public async setCache(cache: Cache): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ cache }, () => {
        resolve();
      });
    });
  }

  public async clearCache(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove('cache', () => {
        resolve();
      });
    });
  }
}

export const storageService = StorageService.getInstance();
