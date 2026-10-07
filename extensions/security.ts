// Pure request and path checks for the mirror server; no Pi or Node server state, so they run under node --test.
import * as net from "node:net";
import * as path from "node:path";

/** The lower-case hostname of a Host header value, without IPv6 brackets, or null if it does not parse. */
function hostnameOf(hostHeader: string): string | null {
  try {
    return new URL(`http://${hostHeader}`).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Quotes a string as one POSIX shell word. */
export function shellSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** Quotes a string as an AppleScript string literal. */
export function appleScriptString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Whether a bind address only accepts connections from this machine. */
export function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "::1" || /^127(\.\d{1,3}){3}$/.test(h);
}

/** Whether a Host header names localhost, an IP address or one of extraHosts; any other name points to DNS rebinding. */
export function isAllowedHost(hostHeader: string | undefined, extraHosts: string[] = []): boolean {
  if (!hostHeader) return false;
  const hostname = hostnameOf(hostHeader);
  if (!hostname) return false;
  return hostname === "localhost" || net.isIP(hostname) !== 0 || extraHosts.some((h) => h.toLowerCase() === hostname);
}

/** Whether a request may act on Tau: no Origin (not a browser) or an Origin on the request's own host and one of Tau's ports. */
export function isAllowedOrigin(originHeader: string | undefined, hostHeader: string | undefined, ports: number[]): boolean {
  if (originHeader === undefined) return true;
  if (!hostHeader) return false;
  try {
    const origin = new URL(originHeader);
    if (origin.protocol !== "http:" && origin.protocol !== "https:") return false;
    const port = Number(origin.port || (origin.protocol === "https:" ? 443 : 80));
    return origin.hostname.replace(/^\[|\]$/g, "").toLowerCase() === hostnameOf(hostHeader) && ports.includes(port);
  } catch {
    return false;
  }
}

/** Whether the path is a .jsonl file inside sessionsDir, the only files the browser may read, switch to or delete. */
export function isSessionFilePath(filePath: string, sessionsDir: string): boolean {
  if (!filePath) return false;
  const resolved = path.resolve(filePath);
  return resolved.startsWith(path.resolve(sessionsDir) + path.sep) && resolved.endsWith(".jsonl");
}
