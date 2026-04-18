import type { Analysis } from "./api";

const KEY = "scriptiq:history:v1";

function read(): Analysis[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(items: Analysis[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("scriptiq:history-updated"));
  } catch {
    /* quota */
  }
}

export const history = {
  list(): Analysis[] {
    return read().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },
  get(id: string): Analysis | undefined {
    return read().find((x) => x.id === id);
  },
  save(a: Analysis) {
    const items = read();
    const idx = items.findIndex((x) => x.id === a.id);
    if (idx >= 0) items[idx] = a;
    else items.unshift(a);
    write(items);
  },
  rename(id: string, title: string) {
    const items = read();
    const it = items.find((x) => x.id === id);
    if (it) {
      it.title = title;
      write(items);
    }
  },
  remove(id: string) {
    write(read().filter((x) => x.id !== id));
  },
  clear() {
    write([]);
  },
};
