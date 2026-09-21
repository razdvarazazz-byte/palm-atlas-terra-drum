const DB_NAME = "pulse-audio";
const DB_VERSION = 2;

export const STORE_BUFFERS = "buffers";
export const STORE_PROJECTS = "projects";
export const STORE_LIST = "meta";

let opening: Promise<IDBDatabase> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = globalThis.setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (v) => {
        globalThis.clearTimeout(t);
        resolve(v);
      },
      (err) => {
        globalThis.clearTimeout(t);
        reject(err);
      },
    );
  });
}

export function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB недоступен"));
  }
  if (opening) return opening;
  opening = withTimeout(
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_BUFFERS)) db.createObjectStore(STORE_BUFFERS);
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) db.createObjectStore(STORE_PROJECTS);
        if (!db.objectStoreNames.contains(STORE_LIST)) db.createObjectStore(STORE_LIST);
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        opening = null;
        reject(req.error);
      };
      req.onblocked = () => {
        opening = null;
        reject(new Error("IndexedDB занят"));
      };
    }),
    4000,
    "IndexedDB timeout",
  ).catch((err) => {
    opening = null;
    throw err;
  });
  return opening;
}

export async function idbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb();
  return withTimeout(
    new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    }),
    8000,
    "idb get timeout",
  );
}

export async function idbSet(store: string, key: IDBValidKey, value: unknown): Promise<void> {
  const db = await openDb();
  return withTimeout(
    new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("idb abort"));
    }),
    12000,
    "idb set timeout",
  );
}

export async function idbDel(store: string, key: IDBValidKey): Promise<void> {
  const db = await openDb();
  return withTimeout(
    new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }),
    8000,
    "idb del timeout",
  );
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      return await withTimeout(navigator.storage.persist(), 1500, "persist timeout");
    }
  } catch {
    /* private mode / timeout */
  }
  return false;
}
