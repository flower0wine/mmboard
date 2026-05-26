import { Gauge, X, Zap } from 'lucide-react';
import type { CSSProperties, PointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { BallStats } from '../../types/floatingBall';

const DRAG_THRESHOLD = 4;

export function FloatingBall() {
  const [expanded, setExpanded] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const dragStateRef = useRef({
    active: false,
    moved: false,
    lastX: 0,
    lastY: 0,
    totalX: 0,
    totalY: 0,
  });
  const [stats, setStats] = useState<BallStats>({
    percent: 0,
    usedMb: 0,
    totalMb: 0,
  });

  useEffect(() => {
    return window.mmboard?.onFloatingBallStats(setStats);
  }, []);

  useEffect(() => {
    void window.mmboard?.setFloatingBallExpanded(expanded);
  }, [expanded]);

  async function boost() {
    setBoosting(true);
    const nextStats = await window.mmboard?.boostFloatingBall();
    if (nextStats) setStats(nextStats);
    window.setTimeout(() => setBoosting(false), 900);
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;

    dragStateRef.current = {
      active: true,
      moved: false,
      lastX: event.screenX,
      lastY: event.screenY,
      totalX: 0,
      totalY: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;
    if (!dragState.active) return;

    const deltaX = event.screenX - dragState.lastX;
    const deltaY = event.screenY - dragState.lastY;
    if (deltaX === 0 && deltaY === 0) return;

    dragState.totalX += deltaX;
    dragState.totalY += deltaY;

    if (Math.hypot(dragState.totalX, dragState.totalY) >= DRAG_THRESHOLD) {
      dragState.moved = true;
    }

    dragState.lastX = event.screenX;
    dragState.lastY = event.screenY;
    void window.mmboard?.moveFloatingBall({ deltaX, deltaY });
  }

  function stopDrag(event: PointerEvent<HTMLButtonElement>) {
    dragStateRef.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function openExpanded() {
    if (dragStateRef.current.moved) {
      dragStateRef.current.moved = false;
      return;
    }

    setExpanded(true);
  }

  if (!expanded) {
    return (
      <main
        className="grid h-screen w-screen place-items-center bg-transparent p-2"
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <div className="relative grid h-20 w-20 place-items-center rounded-full">
          <button
            type="button"
            onPointerDown={startDrag}
            onClick={openExpanded}
            className="window-no-drag grid h-20 w-20 place-items-center rounded-full bg-floating-meter text-primary-foreground shadow-floating-ball transition hover:scale-[1.03]"
            style={{ '--ball-percent': `${stats.percent}%`, touchAction: 'none' } as CSSProperties}
            title="Open accelerator"
          >
            <span className="grid h-[64px] w-[64px] place-items-center rounded-full bg-floating-core shadow-inner">
              <span className="text-xl font-semibold leading-none">{stats.percent}</span>
              <span className="-mt-4 text-[10px] font-medium uppercase text-floating-label">mem</span>
            </span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen bg-transparent p-3">
      <section className="overflow-hidden rounded-lg border border-border bg-surface-panel text-foreground shadow-ball backdrop-blur-xl">
        <header className="window-drag flex h-11 items-center justify-between border-b px-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Gauge size={17} />
            mmboard boost
          </div>
          <button type="button" onClick={() => setExpanded(false)} className="window-no-drag grid h-7 w-7 place-items-center rounded-md text-foreground-muted transition hover:bg-accent hover:text-accent-foreground" title="Collapse">
            <X size={15} />
          </button>
        </header>

        <div className="grid gap-3 p-3">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-20 w-20 shrink-0 place-items-center rounded-full border border-border-soft bg-floating-meter text-primary-foreground shadow-md ${
                boosting ? 'animate-boost-pulse' : ''
              }`}
              style={{ '--ball-percent': `${stats.percent}%` } as CSSProperties}
            >
              <div className="grid h-14 w-14 place-items-center rounded-full bg-floating-core">
                <span className="text-xl font-semibold">{stats.percent}%</span>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold">Memory load</p>
              <p className="mt-1 text-xs text-foreground-muted">
                {stats.usedMb.toLocaleString()} MB / {stats.totalMb.toLocaleString()} MB
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-subtle">
                <div
                  className="h-full rounded-full bg-floating-accent transition-all duration-500"
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <button type="button" onClick={() => void boost()} className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover">
              <Zap size={16} />
              Boost
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
