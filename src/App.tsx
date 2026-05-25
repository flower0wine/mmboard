import { Archive, Check, Clock3, GripHorizontal, LayoutGrid, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Memory = {
  id: string;
  title: string;
  body: string;
  tag: string;
  color: string;
  pinned: boolean;
  createdAt: string;
};

type FloatingState = {
  mode: 'full' | 'compact';
  edge: 'left' | 'right' | 'top' | 'bottom';
};

const STORAGE_KEY = 'mmboard.memories.v1';

const colors = [
  { name: 'sage', value: 'bg-sage' },
  { name: 'amber', value: 'bg-amber' },
  { name: 'sky', value: 'bg-sky' },
  { name: 'rose', value: 'bg-rose' },
];

const seedMemories: Memory[] = [
  {
    id: 'welcome',
    title: 'Morning thought',
    body: 'Capture the point first. Shape it later.',
    tag: 'idea',
    color: 'bg-sage',
    pinned: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'reading',
    title: 'Book note',
    body: 'Look up spatial memory techniques for board-style recall.',
    tag: 'read',
    color: 'bg-sky',
    pinned: false,
    createdAt: new Date().toISOString(),
  },
];

function readMemories() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedMemories;

  try {
    const parsed = JSON.parse(raw) as Memory[];
    return Array.isArray(parsed) ? parsed : seedMemories;
  } catch {
    return seedMemories;
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function App() {
  const [memories, setMemories] = useState<Memory[]>(readMemories);
  const [query, setQuery] = useState('');
  const [floatingState, setFloatingState] = useState<FloatingState>({ mode: 'full', edge: 'right' });
  const [draft, setDraft] = useState({
    title: '',
    body: '',
    tag: '',
    color: colors[0].value,
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    return window.mmboard?.onFloatingModeChanged(setFloatingState);
  }, []);

  const filteredMemories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const ordered = [...memories].sort((a, b) => Number(b.pinned) - Number(a.pinned));

    if (!needle) return ordered;

    return ordered.filter((memory) =>
      [memory.title, memory.body, memory.tag].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [memories, query]);

  const stats = useMemo(() => {
    const tags = new Set(memories.map((memory) => memory.tag).filter(Boolean));
    return {
      total: memories.length,
      pinned: memories.filter((memory) => memory.pinned).length,
      tags: tags.size,
    };
  }, [memories]);

  function addMemory() {
    if (!draft.title.trim() && !draft.body.trim()) return;

    const memory: Memory = {
      id: crypto.randomUUID(),
      title: draft.title.trim() || 'Untitled memory',
      body: draft.body.trim(),
      tag: draft.tag.trim() || 'note',
      color: draft.color,
      pinned: false,
      createdAt: new Date().toISOString(),
    };

    setMemories((current) => [memory, ...current]);
    setDraft({ title: '', body: '', tag: '', color: colors[0].value });
  }

  function togglePinned(id: string) {
    setMemories((current) =>
      current.map((memory) => (memory.id === id ? { ...memory, pinned: !memory.pinned } : memory)),
    );
  }

  function removeMemory(id: string) {
    setMemories((current) => current.filter((memory) => memory.id !== id));
  }

  if (floatingState.mode === 'compact') {
    return (
      <main className="grid h-screen w-screen place-items-center bg-transparent">
        <div className="window-drag absolute left-1/2 top-1 z-10 grid h-5 w-9 -translate-x-1/2 place-items-center rounded-full bg-white/75 text-stone-500 shadow-sm">
          <GripHorizontal size={14} />
        </div>
        <button
          type="button"
          onClick={() => void window.mmboard?.expandFloatingWindow()}
          className="window-no-drag grid h-16 w-16 place-items-center rounded-full border border-white/70 bg-stone-950 text-white shadow-soft transition hover:scale-105 hover:bg-stone-800"
          title="Open mmboard"
        >
          <LayoutGrid size={24} />
          <span className="sr-only">Open mmboard</span>
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <div className="window-drag fixed left-1/2 top-2 z-50 grid h-6 w-32 -translate-x-1/2 place-items-center rounded-full border border-stone-200 bg-white/80 text-stone-400 shadow-sm">
        <GripHorizontal size={18} />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-6 py-6">
        <aside className="window-drag hidden w-64 shrink-0 flex-col justify-between rounded-lg border border-stone-200 bg-white/80 p-5 shadow-soft lg:flex">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-stone-950 text-white">
                <LayoutGrid size={20} />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-normal">mmboard</h1>
                <p className="text-sm text-stone-500">memory board</p>
              </div>
            </div>

            <nav className="space-y-2 text-sm font-medium">
              <button className="flex w-full items-center gap-3 rounded-md bg-stone-950 px-3 py-2 text-left text-white">
                <Sparkles size={16} />
                Board
              </button>
              <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-stone-600 hover:bg-stone-100">
                <Archive size={16} />
                Archive
              </button>
            </nav>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="rounded-md bg-stone-100 p-3">
              <p className="text-stone-500">Total memories</p>
              <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-stone-100 p-3">
                <p className="text-stone-500">Pinned</p>
                <p className="mt-1 text-xl font-semibold">{stats.pinned}</p>
              </div>
              <div className="rounded-md bg-stone-100 p-3">
                <p className="text-stone-500">Tags</p>
                <p className="mt-1 text-xl font-semibold">{stats.tags}</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="window-drag mb-5 flex flex-col gap-4 rounded-lg border border-stone-200 bg-white/80 p-4 shadow-soft md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">today's board</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-normal">Quick capture</h2>
            </div>
            <label className="relative block w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 w-full rounded-md border border-stone-200 bg-stone-50 pl-10 pr-3 text-sm outline-none ring-stone-900/10 transition focus:border-stone-400 focus:ring-4"
                placeholder="Search memories"
              />
            </label>
          </header>

          <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[360px_1fr]">
            <form
              className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft"
              onSubmit={(event) => {
                event.preventDefault();
                addMemory();
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold">New memory</h3>
                <button
                  type="submit"
                  className="grid h-9 w-9 place-items-center rounded-md bg-stone-950 text-white transition hover:bg-stone-800"
                  title="Add memory"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  className="h-11 w-full rounded-md border border-stone-200 bg-stone-50 px-3 text-sm outline-none ring-stone-900/10 transition focus:border-stone-400 focus:ring-4"
                  placeholder="Title"
                />
                <textarea
                  value={draft.body}
                  onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                  className="min-h-40 w-full resize-none rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 outline-none ring-stone-900/10 transition focus:border-stone-400 focus:ring-4"
                  placeholder="Write it before it fades"
                />
                <input
                  value={draft.tag}
                  onChange={(event) => setDraft((current) => ({ ...current, tag: event.target.value }))}
                  className="h-11 w-full rounded-md border border-stone-200 bg-stone-50 px-3 text-sm outline-none ring-stone-900/10 transition focus:border-stone-400 focus:ring-4"
                  placeholder="Tag"
                />
                <div className="flex items-center gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      title={color.name}
                      onClick={() => setDraft((current) => ({ ...current, color: color.value }))}
                      className={`h-9 w-9 rounded-md border-2 ${color.value} ${
                        draft.color === color.value ? 'border-stone-950' : 'border-transparent'
                      }`}
                    >
                      <span className="sr-only">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>

            <div className="grid content-start gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filteredMemories.map((memory) => (
                <article key={memory.id} className={`rounded-lg border border-stone-200 ${memory.color} p-4 shadow-soft`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
                        <Clock3 size={14} />
                        {formatTime(memory.createdAt)}
                      </div>
                      <h3 className="break-words text-lg font-semibold leading-6">{memory.title}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePinned(memory.id)}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border ${
                        memory.pinned ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300 bg-white/50'
                      }`}
                      title={memory.pinned ? 'Unpin memory' : 'Pin memory'}
                    >
                      <Check size={16} />
                    </button>
                  </div>

                  <p className="min-h-20 whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">{memory.body}</p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="rounded-md bg-white/55 px-2 py-1 text-xs font-medium text-stone-600">
                      #{memory.tag}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMemory(memory.id)}
                      className="grid h-8 w-8 place-items-center rounded-md text-stone-500 transition hover:bg-white/60 hover:text-red-600"
                      title="Delete memory"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
