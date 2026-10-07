// Pure request and path checks for the mirror server; no Pi or Node server state, so they run under node --test.
import * as path from "node:path";

/** Whether the path is a .jsonl file inside sessionsDir, the only files the browser may read, switch to or delete. */
export function isSessionFilePath(filePath: string, sessionsDir: string): boolean {
  if (!filePath) return false;
  const resolved = path.resolve(filePath);
  return resolved.startsWith(path.resolve(sessionsDir) + path.sep) && resolved.endsWith(".jsonl");
}
