import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../lib/supabase";

const router: IRouter = Router();

export interface StoredFile {
  id: string;
  rollNumber: string;
  path: string;
  name: string;
  folder: string;
  content: string; // Base64 or UTF-8 string
  mimeType: string;
  size: number;
  updatedAt: number;
}

// In-memory high-speed cache for multi-tenant student files
const fileCache = new Map<string, StoredFile>();

function normalizeRoll(rollNumber: unknown): string {
  return String(rollNumber || "STUDENT_DEFAULT").trim().toUpperCase();
}

function normalizePath(rawPath: unknown): string {
  return String(rawPath || "untitled").trim().replace(/^\/+/, "");
}

function getStorageKey(rollNumber: string, cleanPath: string): string {
  return `${rollNumber}:${cleanPath}`;
}

// 1. Write File
router.post("/storage/files/write", async (req, res) => {
  try {
    const rollNumber = normalizeRoll(req.body?.rollNumber);
    const cleanPath = normalizePath(req.body?.path);
    const content = typeof req.body?.content === "object" 
      ? JSON.stringify(req.body.content) 
      : String(req.body?.content || "");
    const mimeType = req.body?.mimeType || "application/octet-stream";
    const name = cleanPath.split("/").pop() || "untitled";
    const folder = cleanPath.includes("/") ? cleanPath.slice(0, cleanPath.lastIndexOf("/")) : "";
    const size = Buffer.byteLength(content, "utf8");
    const updatedAt = Date.now();
    const key = getStorageKey(rollNumber, cleanPath);

    const fileRecord: StoredFile = {
      id: key,
      rollNumber,
      path: cleanPath,
      name,
      folder,
      content,
      mimeType,
      size,
      updatedAt,
    };

    // Store in active cache
    fileCache.set(key, fileRecord);

    // Asynchronously try upserting to Supabase if table exists
    try {
      if (supabaseAdmin) {
        await supabaseAdmin.from("student_files").upsert({
          id: key,
          roll_number: rollNumber,
          path: cleanPath,
          name,
          folder,
          content,
          mime_type: mimeType,
          size_bytes: size,
          updated_at: new Date(updatedAt).toISOString(),
        }).select("id").maybeSingle();
      }
    } catch (_) {
      // Supabase table may not exist yet, cache keeps data safe
    }

    return res.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.name,
        path: fileRecord.path,
        size: fileRecord.size,
        mimeType: fileRecord.mimeType,
        is_dir: false,
        modified: fileRecord.updatedAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to write file" });
  }
});

// 2. Read File
router.get("/storage/files/read", async (req, res) => {
  try {
    const rollNumber = normalizeRoll(req.query["rollNumber"]);
    const cleanPath = normalizePath(req.query["path"]);
    const key = getStorageKey(rollNumber, cleanPath);

    let file = fileCache.get(key);

    if (!file && supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from("student_files")
          .select("*")
          .eq("id", key)
          .maybeSingle();
        if (data) {
          file = {
            id: data.id,
            rollNumber: data.roll_number,
            path: data.path,
            name: data.name,
            folder: data.folder,
            content: data.content,
            mimeType: data.mime_type,
            size: data.size_bytes,
            updatedAt: new Date(data.updated_at).getTime(),
          };
          fileCache.set(key, file);
        }
      } catch (_) {}
    }

    if (!file) {
      return res.status(404).json({ success: false, error: `File not found: ${cleanPath}` });
    }

    return res.json({
      success: true,
      file: {
        id: file.id,
        name: file.name,
        path: file.path,
        content: file.content,
        mimeType: file.mimeType,
        size: file.size,
        modified: file.updatedAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to read file" });
  }
});

// 3. List Files for Roll Number
router.get("/storage/files", async (req, res) => {
  try {
    const rollNumber = normalizeRoll(req.query["rollNumber"]);
    const folder = req.query["folder"] ? String(req.query["folder"]).trim().replace(/^\/+/, "") : null;

    const results: Array<{
      id: string;
      name: string;
      path: string;
      size: number;
      mimeType: string;
      is_dir: boolean;
      modified: number;
    }> = [];

    // From cache
    for (const file of fileCache.values()) {
      if (file.rollNumber === rollNumber) {
        if (!folder || file.folder === folder || file.path.startsWith(folder + "/")) {
          results.push({
            id: file.id,
            name: file.name,
            path: file.path,
            size: file.size,
            mimeType: file.mimeType,
            is_dir: false,
            modified: file.updatedAt,
          });
        }
      }
    }

    // Also check Supabase if cache is cold
    if (results.length === 0 && supabaseAdmin) {
      try {
        let query = supabaseAdmin.from("student_files").select("id, name, path, size_bytes, mime_type, updated_at").eq("roll_number", rollNumber);
        if (folder) {
          query = query.eq("folder", folder);
        }
        const { data } = await query;
        if (data && data.length > 0) {
          for (const row of data) {
            results.push({
              id: row.id,
              name: row.name,
              path: row.path,
              size: row.size_bytes,
              mimeType: row.mime_type,
              is_dir: false,
              modified: new Date(row.updated_at).getTime(),
            });
          }
        }
      } catch (_) {}
    }

    return res.json({ success: true, rollNumber, files: results });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to list files" });
  }
});

// 4. Delete File
router.delete("/storage/files", async (req, res) => {
  try {
    const rollNumber = normalizeRoll(req.query["rollNumber"] || req.body?.rollNumber);
    const cleanPath = normalizePath(req.query["path"] || req.body?.path);
    const key = getStorageKey(rollNumber, cleanPath);

    fileCache.delete(key);

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("student_files").delete().eq("id", key);
      } catch (_) {}
    }

    return res.json({ success: true, message: `Deleted ${cleanPath}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to delete file" });
  }
});

// 5. Rename File
router.post("/storage/files/rename", async (req, res) => {
  try {
    const rollNumber = normalizeRoll(req.body?.rollNumber);
    const oldPath = normalizePath(req.body?.oldPath);
    const newName = String(req.body?.newName || "").trim();
    if (!newName) {
      return res.status(400).json({ success: false, error: "New name is required." });
    }

    const oldKey = getStorageKey(rollNumber, oldPath);
    const existing = fileCache.get(oldKey);

    if (!existing) {
      return res.status(404).json({ success: false, error: "File not found" });
    }

    const folder = oldPath.includes("/") ? oldPath.slice(0, oldPath.lastIndexOf("/")) : "";
    const newPath = folder ? `${folder}/${newName}` : newName;
    const newKey = getStorageKey(rollNumber, newPath);

    const updated: StoredFile = {
      ...existing,
      id: newKey,
      name: newName,
      path: newPath,
      folder,
      updatedAt: Date.now(),
    };

    fileCache.delete(oldKey);
    fileCache.set(newKey, updated);

    return res.json({
      success: true,
      file: {
        id: updated.id,
        name: updated.name,
        path: updated.path,
        size: updated.size,
        modified: updated.updatedAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to rename file" });
  }
});

export default router;
