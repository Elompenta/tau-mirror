/**
 * File Browser — right sidebar file tree with drag-and-drop
 */

const FILE_ICONS = {
  // Folders
  directory: '📁',
  // Code
  js: '📄', ts: '📄', jsx: '📄', tsx: '📄',
  py: '🐍', rb: '💎', go: '📄', rs: '🦀',
  // Web
  html: '🌐', css: '🎨', svg: '🎨',
  // Data
  json: '📋', yaml: '📋', yml: '📋', toml: '📋',
  xml: '📋', csv: '📋',
  // Docs
  md: '📝', txt: '📝', rst: '📝',
  // Images
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️',
  webp: '🖼️', ico: '🖼️',
  // Config
  env: '🔒', gitignore: '🔒', lock: '🔒',
  // Default
  default: '📄',
};

export function getFileIcon(name, isDirectory) {
  if (isDirectory) return FILE_ICONS.directory;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

const SORT_MODES = ['name', 'date', 'size'];

export class FileBrowser {
  constructor(container, pathEl, messageInput, onFileInserted = null, searchInput = null) {
    this.container = container;
    this.pathEl = pathEl;
    this.messageInput = messageInput;
    this.onFileInserted = onFileInserted;
    this.searchInput = searchInput;
    this.currentPath = null;
    this.items = [];
    this.searchQuery = '';
    this.sortBy = SORT_MODES.includes(localStorage.getItem('tau-file-sort'))
      ? localStorage.getItem('tau-file-sort')
      : 'name';

    this.setupDropTarget();
    this.setupPathInput();
  }

  async load(dirPath) {
    this.container.innerHTML = '<div class="file-loading">Loading…</div>';
    this.searchQuery = '';
    if (this.searchInput) this.searchInput.value = '';

    try {
      const url = dirPath
        ? `/api/files?path=${encodeURIComponent(dirPath)}`
        : '/api/files';
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        const message = document.createElement('div');
        message.className = 'file-loading';
        message.textContent = data.error;
        this.container.replaceChildren(message);
        return;
      }

      this.currentPath = data.path;
      this.pathEl.value = data.path;
      this.pathEl.title = data.path;
      this.items = data.items;
      this.render(this.getVisibleItems());
    } catch (err) {
      this.container.innerHTML = '<div class="file-loading">Failed to load</div>';
    }
  }

  getVisibleItems() {
    const query = this.searchQuery.trim().toLowerCase();
    const filtered = query
      ? this.items.filter(item => item.name.toLowerCase().includes(query))
      : this.items;

    const items = [...filtered];
    items.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      if (this.sortBy === 'date') return b.mtime - a.mtime;
      if (this.sortBy === 'size') return (b.size || 0) - (a.size || 0);
      return a.name.localeCompare(b.name);
    });
    return items;
  }

  setSearchQuery(query) {
    this.searchQuery = query;
    this.render(this.getVisibleItems());
  }

  setSortBy(key) {
    if (!SORT_MODES.includes(key)) return;
    this.sortBy = key;
    localStorage.setItem('tau-file-sort', key);
    if (this.items.length) this.render(this.getVisibleItems());
  }

  getParentPath() {
    if (!this.currentPath) return null;
    const sep = this.currentPath.includes('\\') ? '\\' : '/';
    const normalized = this.currentPath.endsWith(sep) ? this.currentPath.slice(0, -1) : this.currentPath;
    const lastSep = normalized.lastIndexOf(sep);
    if (lastSep <= 0) return sep === '/' ? '/' : null;
    const parent = normalized.slice(0, lastSep);
    return /^[A-Za-z]:$/.test(parent) ? parent + sep : parent;
  }

  render(items) {
    this.container.innerHTML = '';

    if (items.length === 0) {
      const message = this.searchQuery ? 'No matches' : 'Empty directory';
      this.container.innerHTML = `<div class="file-loading">${message}</div>`;
      return;
    }

    for (const item of items) {
      const el = document.createElement('div');
      el.className = `file-item${item.isDirectory ? ' directory' : ''}`;
      el.draggable = true;
      el.dataset.path = item.path;
      el.dataset.name = item.name;
      el.dataset.isDirectory = item.isDirectory;

      const icon = getFileIcon(item.name, item.isDirectory);
      const size = item.isDirectory ? '' : formatSize(item.size);

      el.innerHTML = `
        <span class="file-icon">${icon}</span>
        <span class="file-name" title="${item.name}">${item.name}</span>
        ${size ? `<span class="file-size">${size}</span>` : ''}
      `;

      // Click: navigate directory or insert file path into input
      el.addEventListener('click', () => {
        if (item.isDirectory) {
          this.load(item.path);
        } else {
          this.insertPath(item.path);
        }
      });

      // Double-click: open file natively
      el.addEventListener('dblclick', (e) => {
        e.preventDefault();
        if (!item.isDirectory) {
          this.openNatively(item.path);
        }
      });

      // Drag start
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.path);
        e.dataTransfer.effectAllowed = 'copy';
        el.classList.add('dragging');
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
      });

      this.container.appendChild(el);
    }
  }

  async openNatively(filePath) {
    try {
      await fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });
    } catch (err) {
      console.error('[FileBrowser] Failed to open:', err);
    }
  }

  insertPath(filePath) {
    const input = this.messageInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.substring(0, start) + filePath + ' ' + input.value.substring(end);
    input.selectionStart = input.selectionEnd = start + filePath.length + 1;
    input.focus();
    input.dispatchEvent(new Event('input'));
    if (this.onFileInserted) this.onFileInserted(filePath);
  }

  setupPathInput() {
    const input = this.pathEl;

    // Focused: left-align and select all, so a paste replaces the whole path.
    input.addEventListener('focus', () => {
      input.dir = 'ltr';
      input.select();
    });

    // Unfocused: right-align (ellipsis at the start) to show the deepest folder.
    input.addEventListener('blur', () => {
      input.dir = 'rtl';
      if (this.currentPath) input.value = this.currentPath;
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        let path = input.value.trim();
        // Strip quotes added by "Copy as path" in Windows Explorer.
        if (path.length > 1 && ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'")))) {
          path = path.slice(1, -1).trim();
        }
        if (path && path !== this.currentPath) this.load(path);
        input.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.blur();
      }
    });
  }

  setupDropTarget() {
    const input = this.messageInput;

    input.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      input.classList.add('file-drop-hover');
    });

    input.addEventListener('dragleave', () => {
      input.classList.remove('file-drop-hover');
    });

    input.addEventListener('drop', (e) => {
      e.preventDefault();
      input.classList.remove('file-drop-hover');

      const filePath = e.dataTransfer.getData('text/plain');
      // Accept Unix paths (/) and Windows paths (C:\ or C:/)
      if (filePath && (filePath.startsWith('/') || /^[A-Za-z]:[\\\/]/.test(filePath))) {
        this.insertPath(filePath);
      }
    });
  }
}
