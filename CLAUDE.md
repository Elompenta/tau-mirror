# Claude Instructions

## Package identity

Repo: **tau-mirror** | npm package: **@elompenta/tau-mirror**

Production install (OS-independent):
```
npm install -g git+https://github.com/Elompenta/tau-mirror.git#main
```

## How Pi loads tau

Pi loads tau from a separate npm project that **shadows the global npm install**:

| OS      | Path                                                              |
|---------|-------------------------------------------------------------------|
| Windows | `%USERPROFILE%\.pi\agent\npm\node_modules\@elompenta\tau-mirror\` |
| macOS   | `~/.pi/agent/npm/node_modules/@elompenta/tau-mirror/`             |

## Local dev setup

Run automatically when asked to make or test changes locally.

**Windows (PowerShell):**
```powershell
# Remove Pi's shadowing copy
cd "$env:USERPROFILE\.pi\agent\npm"
npm uninstall @elompenta/tau-mirror

# Link this repo to global npm
cd "<repo root>"
npm link
```

**macOS:**
```bash
# Remove Pi's shadowing copy
cd ~/.pi/agent/npm
npm uninstall @elompenta/tau-mirror

# Link this repo to global npm
cd "<repo root>"
npm link
```

After any change to `extensions/mirror-server.ts` — clear jiti cache, then tell the user to restart Pi:

**Windows:**
```powershell
Remove-Item "$env:LOCALAPPDATA\Temp\jiti" -Recurse -Force -ErrorAction SilentlyContinue
```

**macOS:**
```bash
rm -rf "$TMPDIR/jiti"
```

`public/` changes take effect on browser reload — no Pi restart needed.

## Restore production install

**Windows:**
```powershell
npm install -g git+https://github.com/Elompenta/tau-mirror.git#main
```

**macOS:**
```bash
npm install -g git+https://github.com/Elompenta/tau-mirror.git#main
```

## Tests

Unit tests live in `.tests/` (`node:test`, no dependencies) and run with `node --test ".tests/**/*.test.mjs"`; they cover the pure checks in `extensions/security.ts`. `.githooks/pre-push` runs them plus a syntax check of `public/*.js` and must be active in every clone: `git config core.hooksPath .githooks`. The publish workflow runs the same tests.

## Release

Push and tag only after the maintainer has tested the local state and approved it; until then commits stay local.

Set the version with `npm version <x.y.z> --no-git-tag-version`, commit, then push a tag `v<x.y.z>` on that commit. `.github/workflows/publish.yml` publishes it to npm via Trusted Publishing; the tag must match `package.json`.
