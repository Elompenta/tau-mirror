import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { isSessionFilePath } from "../extensions/security.ts";

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
