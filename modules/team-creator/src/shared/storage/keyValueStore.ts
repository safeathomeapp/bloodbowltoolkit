export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class BrowserLocalStorageStore implements KeyValueStore {
  private readonly storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  getItem(key: string) {
    return this.storage.getItem(key)
  }

  setItem(key: string, value: string) {
    this.storage.setItem(key, value)
  }

  removeItem(key: string) {
    this.storage.removeItem(key)
  }
}

export class MemoryKeyValueStore implements KeyValueStore {
  private readonly values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}
