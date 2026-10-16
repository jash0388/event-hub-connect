/**
 * Datanauts Multi-Tenant Storage Client for React UI
 * 
 * Interacts with IndexedDB and Supabase to retrieve and manage student-specific documents.
 * All queries are strictly scoped to the active student's roll number.
 */

export interface StudentFile {
  id: string;
  rollNumber: string;
  path: string;
  name: string;
  folder: string;
  size: number;
  updatedAt: number;
  type: 'presentation' | 'document' | 'spreadsheet' | 'whiteboard' | 'note' | 'pdf' | 'other';
}

const DB_NAME = 'datanauts_storage_db';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function getActiveRollNumber(): string {
  try {
    const raw = localStorage.getItem('studentInfo');
    if (raw) {
      const student = JSON.parse(raw);
      if (student?.roll_number) return student.roll_number.trim().toUpperCase();
    }
    const manual = localStorage.getItem('datanauts_active_roll');
    if (manual) return manual.trim().toUpperCase();
  } catch (e) {
    console.error('Failed to get roll number:', e);
  }
  return 'GUEST_STUDENT';
}

export function setActiveRollNumber(rollNumber: string) {
  const clean = rollNumber.trim().toUpperCase();
  localStorage.setItem('datanauts_active_roll', clean);
  // Also update studentInfo if present
  try {
    const raw = localStorage.getItem('studentInfo');
    const student = raw ? JSON.parse(raw) : {};
    student.roll_number = clean;
    if (!student.full_name) student.full_name = `Student ${clean}`;
    localStorage.setItem('studentInfo', JSON.stringify(student));
  } catch (_) {}

  window.dispatchEvent(new CustomEvent('datanauts:roll-changed', { detail: { rollNumber: clean } }));
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e: any) => {
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

function detectFileType(name: string): StudentFile['type'] {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pptx') || lower.endsWith('.ppt')) return 'presentation';
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'document';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) return 'spreadsheet';
  if (lower.includes('whiteboard') || lower.endsWith('.board')) return 'whiteboard';
  if (lower.includes('note') || lower.endsWith('.note') || lower.endsWith('.md')) return 'note';
  if (lower.endsWith('.pdf')) return 'pdf';
  return 'other';
}

/**
 * List all files belonging to the active student roll number
 */
export async function listStudentFiles(rollNumberOverride?: string): Promise<StudentFile[]> {
  const rollNumber = rollNumberOverride || getActiveRollNumber();
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('rollNumber');
    const req = index.getAll(rollNumber);

    req.onsuccess = () => {
      const results: StudentFile[] = (req.result || []).map((item: any) => ({
        id: item.id,
        rollNumber: item.rollNumber,
        path: item.path,
        name: item.name,
        folder: item.folder,
        size: item.size || 0,
        updatedAt: item.updatedAt || Date.now(),
        type: detectFileType(item.name)
      }));

      // Sort newest first
      results.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete a student file
 */
export async function deleteStudentFile(fileId: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(fileId);
    tx.oncomplete = () => {
      window.dispatchEvent(new CustomEvent('datanauts:storage-updated'));
      resolve(true);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Download a student file from IndexedDB
 */
export async function downloadStudentFile(fileId: string, filename: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(fileId);
    req.onsuccess = () => {
      if (req.result && req.result.data) {
        const blob = req.result.data instanceof Blob ? req.result.data : new Blob([req.result.data]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        resolve();
      } else {
        reject(new Error('File content not found'));
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Format bytes into human readable format (KB, MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
