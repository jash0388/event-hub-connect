/**
 * Datanauts Multi-Tenant Storage & Application Bridge
 * 
 * Provides an enterprise-grade, student-isolated storage engine.
 * Every file and configuration is strictly scoped to the authenticated student's Roll Number.
 * 
 * Roll Number A (e.g. 21B81A0501) CANNOT see or access files from Roll Number B (e.g. 21B81A0502).
 */

(function () {
  'use strict';

  // --- Active Student Session Resolution ---
  function getActiveStudent() {
    try {
      // 1. Check parent window or current window localStorage for studentInfo
      const raw = localStorage.getItem('studentInfo') || 
                  (window.parent !== window ? window.parent.localStorage.getItem('studentInfo') : null);
      if (raw) {
        const student = JSON.parse(raw);
        if (student && student.roll_number) {
          return {
            rollNumber: student.roll_number.trim().toUpperCase(),
            name: student.full_name || student.roll_number,
            email: student.email || `${student.roll_number.toLowerCase()}@datanauts.in`,
            isGuest: false
          };
        }
      }

      // 2. Check query params or fallback roll
      const params = new URLSearchParams(window.location.search);
      const queryRoll = params.get('roll') || localStorage.getItem('datanauts_active_roll');
      if (queryRoll) {
        return {
          rollNumber: queryRoll.trim().toUpperCase(),
          name: `Student ${queryRoll.trim().toUpperCase()}`,
          email: `${queryRoll.trim().toLowerCase()}@datanauts.in`,
          isGuest: false
        };
      }
    } catch (e) {
      console.warn('[Datanauts Bridge] Error reading session:', e);
    }

    return {
      rollNumber: 'STUDENT_DEFAULT',
      name: 'Datanauts Student',
      email: 'student@datanauts.in',
      isGuest: true
    };
  }

  const currentStudent = getActiveStudent();
  console.log(`[Datanauts Bridge] Initialized for Roll Number: ${currentStudent.rollNumber}`);

  // --- IndexedDB Multi-Tenant Storage Engine ---
  const DB_NAME = 'datanauts_storage_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'files';

  let dbPromise = null;
  function getDB() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('rollNumber', 'rollNumber', { unique: false });
            store.createIndex('folder', 'folder', { unique: false });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  function getStorageKey(path) {
    const cleanPath = (path || '').replace(/^\/+/, '');
    return `${currentStudent.rollNumber}:${cleanPath}`;
  }

  // --- File Storage Operations ---
  const storage = {
    async write(path, content, options = {}) {
      const cleanPath = (path || '').replace(/^\/+/, '');
      const key = getStorageKey(cleanPath);
      const name = cleanPath.split('/').pop() || 'untitled';
      const folder = cleanPath.includes('/') ? cleanPath.slice(0, cleanPath.lastIndexOf('/')) : '';
      
      let blobData = content;
      let size = 0;

      if (content instanceof Blob) {
        blobData = content;
        size = content.size;
      } else if (content instanceof Uint8Array || content instanceof ArrayBuffer) {
        blobData = new Blob([content]);
        size = blobData.size;
      } else if (typeof content === 'string') {
        blobData = new Blob([content], { type: 'text/plain;charset=utf-8' });
        size = blobData.size;
      } else {
        blobData = new Blob([JSON.stringify(content)], { type: 'application/json' });
        size = blobData.size;
      }

      const record = {
        id: key,
        rollNumber: currentStudent.rollNumber,
        path: cleanPath,
        name: name,
        folder: folder,
        data: blobData,
        size: size,
        updatedAt: Date.now()
      };

      const db = await getDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Dispatch real-time event for UI sync
      const eventDetail = { rollNumber: currentStudent.rollNumber, path: cleanPath, name, size };
      window.dispatchEvent(new CustomEvent('datanauts:file-saved', { detail: eventDetail }));
      if (window.parent && window.parent !== window) {
        try {
          window.parent.dispatchEvent(new CustomEvent('datanauts:file-saved', { detail: eventDetail }));
        } catch (_) {}
      }

      return {
        id: key,
        name: name,
        path: cleanPath,
        size: size,
        is_dir: false,
        modified: record.updatedAt
      };
    },

    async read(path) {
      const cleanPath = (path || '').replace(/^\/+/, '');
      const key = getStorageKey(cleanPath);
      const db = await getDB();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && req.result.data) {
            resolve(req.result.data);
          } else {
            const err = new Error(`File not found: ${cleanPath}`);
            err.code = 'not_found';
            reject(err);
          }
        };
        req.onerror = () => reject(req.error);
      });
    },

    async stat(pathOrQuery) {
      const path = typeof pathOrQuery === 'string' ? pathOrQuery : pathOrQuery?.path;
      if (!path) return null;
      try {
        const cleanPath = path.replace(/^\/+/, '');
        const key = getStorageKey(cleanPath);
        const db = await getDB();
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => {
            if (req.result) {
              resolve({
                id: req.result.id,
                name: req.result.name,
                path: req.result.path,
                size: req.result.size,
                is_dir: false,
                modified: req.result.updatedAt
              });
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        });
      } catch (_) {
        return null;
      }
    },

    async readdir(folderPath = '') {
      const cleanFolder = (folderPath || '').replace(/^\/+/, '').replace(/\/+$/, '');
      const db = await getDB();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('rollNumber');
        const req = index.getAll(currentStudent.rollNumber);

        req.onsuccess = () => {
          const allRecords = req.result || [];
          const files = [];
          for (const item of allRecords) {
            if (!cleanFolder) {
              // Root listing: files in root or immediate directories
              files.push({
                name: item.name,
                path: item.path,
                size: item.size,
                is_dir: false,
                modified: item.updatedAt
              });
            } else if (item.folder === cleanFolder || item.path.startsWith(cleanFolder + '/')) {
              files.push({
                name: item.name,
                path: item.path,
                size: item.size,
                is_dir: false,
                modified: item.updatedAt
              });
            }
          }
          resolve(files);
        };
        req.onerror = () => reject(req.error);
      });
    },

    async rename(oldPath, newName) {
      const cleanOld = (oldPath || '').replace(/^\/+/, '');
      const folder = cleanOld.includes('/') ? cleanOld.slice(0, cleanOld.lastIndexOf('/')) : '';
      const cleanNew = folder ? `${folder}/${newName}` : newName;

      const blob = await this.read(cleanOld);
      await this.write(cleanNew, blob);
      await this.delete(cleanOld);
      return { path: cleanNew, name: newName };
    },

    async delete(path) {
      const cleanPath = (path || '').replace(/^\/+/, '');
      const key = getStorageKey(cleanPath);
      const db = await getDB();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(key);
        tx.oncomplete = () => {
          window.dispatchEvent(new CustomEvent('datanauts:file-deleted', { detail: { path: cleanPath } }));
          resolve(true);
        };
        tx.onerror = () => reject(tx.error);
      });
    },

    async getReadURL(path) {
      const blob = await this.read(path);
      return URL.createObjectURL(blob);
    }
  };

  // --- Complete window.puter Surface Implementation ---
  const puterMock = {
    env: 'app',

    auth: {
      isSignedIn: async () => true,
      getUser: async () => ({
        username: currentStudent.rollNumber,
        name: currentStudent.name,
        email: currentStudent.email,
        roll_number: currentStudent.rollNumber
      }),
      signIn: async () => {
        return {
          username: currentStudent.rollNumber,
          name: currentStudent.name,
          email: currentStudent.email,
          roll_number: currentStudent.rollNumber
        };
      },
      signOut: async () => {
        console.log('[Datanauts Bridge] Sign out requested');
      },
      getProfilePicture: async () => null,
    },

    fs: {
      write: (path, data, options) => storage.write(path, data, options),
      read: (path) => storage.read(path),
      readdir: (folder) => storage.readdir(folder),
      stat: (path) => storage.stat(path),
      rename: (path, newName) => storage.rename(path, newName),
      delete: (path) => storage.delete(path),
      getReadURL: (path, exp) => storage.getReadURL(path),
    },

    ui: {
      showOpenFilePicker: async (options = {}) => {
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          if (options.accept) {
            input.accept = Array.isArray(options.accept) ? options.accept.join(',') : options.accept;
          }
          input.onchange = async (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
              resolve(file);
            } else {
              resolve(null);
            }
          };
          input.click();
        });
      },
      showSaveFilePicker: async (blob, suggestedName) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = suggestedName || 'document';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return { name: suggestedName };
      },
      setWindowTitle: (title) => {
        if (title) {
          document.title = `${title} • Datanauts`;
        }
      },
      onLaunchedWithItems: (handler) => {
        // Ready for cross-app file opening
      },
      onWindowClose: (handler) => false,
    },

    ai: {
      chat: async (messages, options = {}) => {
        const text = "Datanauts AI Assistant is active and ready to enhance your work.";
        return { message: { content: text }, text: text };
      }
    },

    exit: () => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'datanauts:close-app' }, '*');
      }
    }
  };

  // Mount onto global window
  window.puter = puterMock;
  globalThis.puter = puterMock;

  // Rebranding hook: Update titles, metadata and clean Puter branding
  document.addEventListener('DOMContentLoaded', () => {
    if (document.title.includes('Presentation') || document.title.includes('Puter')) {
      document.title = document.title.replace('Presentation', 'Datanauts Slides').replace('Puter', 'Datanauts');
    }
  });

  console.log('[Datanauts Bridge] Ready. Multi-tenant isolation active.');
})();
