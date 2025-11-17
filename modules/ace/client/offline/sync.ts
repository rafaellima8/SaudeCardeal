/**
 * ACE Offline Sync Module
 * Gerencia sincronização offline usando IndexedDB
 */

// Tipos para sincronização (espelhados do server)
interface AceSyncRequest {
  dwellings: any[];
  visits: any[];
  photos: any[];
}

interface AceSyncResponse {
  success: boolean;
  dwellings: Record<string, string>;
  visits: Record<string, string>;
  photos: Record<string, string>;
  errors: Array<{
    type: string;
    external_id: string;
    error: string;
  }>;
}

const DB_NAME = "ace_offline_db";
const DB_VERSION = 1;

// Stores do IndexedDB
const STORES = {
  DWELLINGS: "dwellings",
  VISITS: "visits",
  PHOTOS: "photos",
  SYNC_QUEUE: "sync_queue",
} as const;

// Interface para item da fila de sincronização
interface SyncQueueItem {
  id: string;
  type: "dwelling" | "visit" | "photo";
  data: any;
  created_at: number;
  synced: boolean;
}

/**
 * Inicializa IndexedDB
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store para dwellings
      if (!db.objectStoreNames.contains(STORES.DWELLINGS)) {
        const dwellingStore = db.createObjectStore(STORES.DWELLINGS, { keyPath: "external_id" });
        dwellingStore.createIndex("unit_id", "unit_id", { unique: false });
        dwellingStore.createIndex("created_at", "created_at", { unique: false });
      }

      // Store para visits
      if (!db.objectStoreNames.contains(STORES.VISITS)) {
        const visitStore = db.createObjectStore(STORES.VISITS, { keyPath: "external_id" });
        visitStore.createIndex("dwelling_external_id", "dwelling_external_id", { unique: false });
        visitStore.createIndex("visit_date", "visit_date", { unique: false });
      }

      // Store para photos
      if (!db.objectStoreNames.contains(STORES.PHOTOS)) {
        const photoStore = db.createObjectStore(STORES.PHOTOS, { keyPath: "external_id" });
        photoStore.createIndex("entity_type", "entity_type", { unique: false });
      }

      // Store para fila de sincronização
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id" });
        queueStore.createIndex("synced", "synced", { unique: false });
        queueStore.createIndex("created_at", "created_at", { unique: false });
      }
    };
  });
}

/**
 * Gera external_id único (UUID v4)
 */
export function generateExternalId(): string {
  return crypto.randomUUID();
}

/**
 * Salva dwelling no IndexedDB
 */
export async function saveDwelling(dwelling: any): Promise<string> {
  const db = await initDB();
  const external_id = dwelling.external_id || generateExternalId();
  
  const dwellingData = {
    ...dwelling,
    external_id,
    created_at: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DWELLINGS], "readwrite");
    const store = transaction.objectStore(STORES.DWELLINGS);
    const request = store.put(dwellingData);

    request.onsuccess = () => {
      // Adicionar à fila de sincronização
      addToSyncQueue(db, "dwelling", dwellingData);
      resolve(external_id);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva visit no IndexedDB
 */
export async function saveVisit(visit: any): Promise<string> {
  const db = await initDB();
  const external_id = visit.external_id || generateExternalId();
  
  const visitData = {
    ...visit,
    external_id,
    created_at: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.VISITS], "readwrite");
    const store = transaction.objectStore(STORES.VISITS);
    const request = store.put(visitData);

    request.onsuccess = () => {
      // Adicionar à fila de sincronização
      addToSyncQueue(db, "visit", visitData);
      resolve(external_id);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva photo no IndexedDB
 */
export async function savePhoto(photo: any): Promise<string> {
  const db = await initDB();
  const external_id = photo.external_id || generateExternalId();
  
  const photoData = {
    ...photo,
    external_id,
    created_at: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PHOTOS], "readwrite");
    const store = transaction.objectStore(STORES.PHOTOS);
    const request = store.put(photoData);

    request.onsuccess = () => {
      // Adicionar à fila de sincronização
      addToSyncQueue(db, "photo", photoData);
      resolve(external_id);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Adiciona item à fila de sincronização
 */
function addToSyncQueue(db: IDBDatabase, type: "dwelling" | "visit" | "photo", data: any): void {
  const queueItem: SyncQueueItem = {
    id: generateExternalId(),
    type,
    data,
    created_at: Date.now(),
    synced: false,
  };

  const transaction = db.transaction([STORES.SYNC_QUEUE], "readwrite");
  const store = transaction.objectStore(STORES.SYNC_QUEUE);
  store.put(queueItem);
}

/**
 * Obtém itens pendentes de sincronização
 */
async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_QUEUE], "readonly");
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const index = store.index("synced");
    const request = index.getAll(IDBKeyRange.only(false));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Marca itens como sincronizados
 */
async function markAsSynced(itemIds: string[]): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_QUEUE], "readwrite");
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    itemIds.forEach((id) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.synced = true;
          store.put(item);
        }
      };
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Sincroniza batch de dados com o servidor
 * Chama POST /api/ace/sync
 */
export async function syncToServer(batch?: AceSyncRequest): Promise<AceSyncResponse> {
  // Se não fornecer batch, buscar itens pendentes
  let syncBatch: AceSyncRequest;
  let queueItemIds: string[] = [];

  if (batch) {
    syncBatch = batch;
  } else {
    // Buscar itens pendentes da fila
    const pendingItems = await getPendingSyncItems();
    
    syncBatch = {
      dwellings: pendingItems
        .filter((item) => item.type === "dwelling")
        .map((item) => item.data),
      visits: pendingItems
        .filter((item) => item.type === "visit")
        .map((item) => item.data),
      photos: pendingItems
        .filter((item) => item.type === "photo")
        .map((item) => item.data),
    };

    queueItemIds = pendingItems.map((item) => item.id);
  }

  // Chamar API de sincronização
  const response = await fetch("/api/ace/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(syncBatch),
  });

  if (!response.ok) {
    throw new Error(`Erro ao sincronizar: ${response.statusText}`);
  }

  const result: AceSyncResponse = await response.json();

  // Marcar itens como sincronizados se não houve erros
  if (result.success && queueItemIds.length > 0) {
    await markAsSynced(queueItemIds);
  }

  return result;
}

/**
 * Obtém estatísticas de sincronização
 */
export async function getSyncStats(): Promise<{
  pendingDwellings: number;
  pendingVisits: number;
  pendingPhotos: number;
  totalPending: number;
}> {
  const pendingItems = await getPendingSyncItems();

  return {
    pendingDwellings: pendingItems.filter((item) => item.type === "dwelling").length,
    pendingVisits: pendingItems.filter((item) => item.type === "visit").length,
    pendingPhotos: pendingItems.filter((item) => item.type === "photo").length,
    totalPending: pendingItems.length,
  };
}

/**
 * Limpa dados sincronizados antigos (opcional)
 */
export async function cleanSyncedData(olderThanDays: number = 30): Promise<number> {
  const db = await initDB();
  const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_QUEUE], "readwrite");
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const index = store.index("synced");
    const request = index.openCursor(IDBKeyRange.only(true));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const item: SyncQueueItem = cursor.value;
        if (item.synced && item.created_at < cutoffTime) {
          cursor.delete();
          deletedCount++;
        }
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve(deletedCount);
    transaction.onerror = () => reject(transaction.error);
  });
}
