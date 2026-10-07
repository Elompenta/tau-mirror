import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { appleScriptString, isAllowedHost, isAllowedOrigin, isLoopbackHost, isSessionFilePath, shellSingleQuote } from "../extensions/security.ts";

test("shellSingleQuote wraps a path as one shell word, including single quotes", () => {
  assert.equal(shellSingleQuote("/Users/me/my project"), "'/Users/me/my project'");
  assert.equal(shellSingleQuote("/Users/me/it's"), "'/Users/me/it'\\''s'");
  assert.equal(shellSingleQuote("/tmp/$(rm -rf ~);`id`"), "'/tmp/$(rm -rf ~);`id`'");
  assert.equal(shellSingleQuote(""), "''");
});

test("appleScriptString escapes quotes and backslashes so input cannot end the literal", () => {
  assert.equal(appleScriptString("cd '/a b' && pi"), `"cd '/a b' && pi"`);
  assert.equal(appleScriptString('x" & do shell script "evil'), `"x\\" & do shell script \\"evil"`);
  assert.equal(appleScriptString("a\\b"), `"a\\\\b"`);
  assert.equal(appleScriptString('\\"'), `"\\\\\\""`);
});

test("isLoopbackHost accepts loopback bind addresses", () => {
  for (const host of ["127.0.0.1", "127.1.2.3", "::1", "[::1]", "localhost", " LOCALHOST "]) {
    assert.equal(isLoopbackHost(host), true, host);
  }
});

test("isLoopbackHost rejects addresses reachable from the network", () => {
  for (const host of ["0.0.0.0", "::", "192.168.1.20", "100.64.0.7", "127.0.0.1.evil.com", "1270.0.0.1", ""]) {
    assert.equal(isLoopbackHost(host), false, host);
  }
});

const ports = [3001, 3002, 3011];

test("isAllowedHost accepts localhost and IP literals with or without port", () => {
  for (const host of ["localhost", "localhost:3001", "LOCALHOST:3001", "127.0.0.1:3001", "192.168.1.20:3001", "100.64.0.7:3001", "[::1]:3001", "[fe80::1]:3001"]) {
    assert.equal(isAllowedHost(host), true, host);
  }
});

test("isAllowedHost rejects other names, which a DNS rebinding attack would send", () => {
  for (const host of ["evil.com:3001", "localhost.evil.com:3001", "127.0.0.1.nip.io:3001", "pc.tailnet.ts.net:3001"]) {
    assert.equal(isAllowedHost(host), false, host);
  }
});

test("isAllowedHost accepts configured extra hosts case-insensitively", () => {
  assert.equal(isAllowedHost("PC.tailnet.ts.net:3001", ["pc.tailnet.ts.net"]), true);
  assert.equal(isAllowedHost("other.ts.net:3001", ["pc.tailnet.ts.net"]), false);
});

test("isAllowedHost rejects missing or malformed Host headers", () => {
  assert.equal(isAllowedHost(undefined), false);
  assert.equal(isAllowedHost(""), false);
  assert.equal(isAllowedHost("a b:3001"), false);
});

test("isAllowedOrigin accepts requests without Origin (curl, monitoring)", () => {
  assert.equal(isAllowedOrigin(undefined, "127.0.0.1:3001", ports), true);
});

test("isAllowedOrigin accepts the page's own origin and another Tau port on the same host", () => {
  assert.equal(isAllowedOrigin("http://127.0.0.1:3001", "127.0.0.1:3001", ports), true);
  assert.equal(isAllowedOrigin("http://127.0.0.1:3001", "127.0.0.1:3002", ports), true);
  assert.equal(isAllowedOrigin("http://[::1]:3001", "[::1]:3001", ports), true);
  assert.equal(isAllowedOrigin("http://Localhost:3011", "localhost:3001", ports), true);
});

test("isAllowedOrigin rejects other websites", () => {
  assert.equal(isAllowedOrigin("https://example.com", "127.0.0.1:3001", ports), false);
  assert.equal(isAllowedOrigin("http://evil.com:3001", "127.0.0.1:3001", ports), false);
});

test("a DNS rebinding request looks same-origin and is stopped by the Host check alone", () => {
  assert.equal(isAllowedOrigin("http://evil.com:3001", "evil.com:3001", ports), true);
  assert.equal(isAllowedHost("evil.com:3001"), false);
});

test("isAllowedOrigin rejects same host on a non-Tau port, opaque and non-http origins", () => {
  assert.equal(isAllowedOrigin("http://127.0.0.1:8080", "127.0.0.1:3001", ports), false);
  assert.equal(isAllowedOrigin("http://127.0.0.1", "127.0.0.1:3001", ports), false);
  assert.equal(isAllowedOrigin("null", "127.0.0.1:3001", ports), false);
  assert.equal(isAllowedOrigin("file://", "127.0.0.1:3001", ports), false);
  assert.equal(isAllowedOrigin("http://127.0.0.1:3001", undefined, ports), false);
});

const sessionsDir = path.join(os.tmpdir(), "tau-test-sessions");

test("isSessionFilePath accepts a .jsonl file inside the sessions dir", () => {
  assert.equal(isSessionFilePath(path.join(sessionsDir, "--proj--", "a.jsonl"), sessionsDir), true);
});

test("isSessionFilePath rejects files outside the sessions dir", () => {
  assert.equal(isSessionFilePath(path.join(os.tmpdir(), "other", "a.jsonl"), sessionsDir), false);
  assert.equal(isSessionFilePath(path.join(sessionsDir, "..", "a.jsonl"), sessionsDir), false);
  assert.equal(isSessionFilePath(path.join(sessionsDir, "--proj--", "..", "..", "secret.jsonl"), sessionsDir), false);
});

test("isSessionFilePath rejects a sibling dir sharing the sessions dir prefix", () => {
  assert.equal(isSessionFilePath(sessionsDir + "-evil" + path.sep + "a.jsonl", sessionsDir), false);
});

test("isSessionFilePath rejects non-session files and empty input", () => {
  assert.equal(isSessionFilePath(path.join(sessionsDir, "--proj--", "a.json"), sessionsDir), false);
  assert.equal(isSessionFilePath(sessionsDir, sessionsDir), false);
  assert.equal(isSessionFilePath("", sessionsDir), false);
});
