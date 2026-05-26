import { Gauge, X, Zap } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { BallStats } from '../../types/floatingBall';

export function FloatingBall() {
  const [expanded, setExpanded] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [stats, setStats] = useState<BallStats>({
    percent: 0,
    usedMb: 0,
    totalMb: 0,
  });

  useEffect(() => {
    return window.mmboard?.onFloatingBallStats(setStats);
  }, []);

  useEffect(() => {
    return window.mmboard?.onMainLog((msg) => console.log(msg));
  }, []);

  useEffect(() => {
    window.mmboard?.setFloatingBallExpanded(expanded);
  }, [expanded]);

  async function boost() {
    setBoosting(true);
    const nextStats = await window.mmboard?.boostFloatingBall();
    if (nextStats) setStats(nextStats);
    window.setTimeout(() => setBoosting(false), 900);
  }

  function openExpanded() {
    setExpanded(true);
  }

  const ballRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ballRef.current;
    if (!el) { console.log('[球] ❌ ballRef.current 为空'); return; }
    if (expanded) { console.log('[球] ℹ️ 已展开，跳过绑定 mousedown'); return; }

    console.log('[球] ✅ 已绑定 mousedown 到 div 元素');

    function onDown(event: MouseEvent) {
      console.log('[球] 🔽 mousedown 触发', { button: event.button, screenX: event.screenX, screenY: event.screenY, target: event.target });
      if (event.button !== 0) { console.log('[球] ⏭️ 非左键点击，忽略'); return; }

      const startX = event.screenX;
      const startY = event.screenY;
      let moved = false;
      console.log('[球] 📍 记录起始位置', { startX, startY });

      function onMove(ev: MouseEvent) {
        if (moved) return;
        const dist = Math.hypot(ev.screenX - startX, ev.screenY - startY);
        console.log('[球] 🖱️ mousemove', { screenX: ev.screenX, screenY: ev.screenY, dist });
        if (dist <= 5) return;

        moved = true;
        console.log('[球] 🏁 超过 5px 阈值，发送 dragStart');
        window.mmboard?.dragStart({ startX, startY });
      }

      function onUp() {
        console.log('[球] 🔼 mouseup 触发', { moved });
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (moved) {
          console.log('[球] 📦 发送 dragStop');
          window.mmboard?.dragStop();
        } else {
          console.log('[球] 👆 未移动，视为点击展开');
          openExpanded();
        }
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      console.log('[球] 👂 已添加 window mousemove/mouseup 监听');
    }

    el.addEventListener('mousedown', onDown);
    return () => {
      console.log('[球] 🧹 清理 mousedown 监听');
      el.removeEventListener('mousedown', onDown);
    };
  }, [expanded]);

  if (!expanded) {
    return (
      <main className="grid h-screen w-screen place-items-center bg-transparent p-2">
        <div
          ref={ballRef}
          className="grid h-20 w-20 place-items-center rounded-full bg-floating-meter text-primary-foreground shadow-floating-ball cursor-auto active:cursor-grabbing"
          style={{ '--ball-percent': `${stats.percent}%` } as CSSProperties}
        >
          <span className="col-start-1 row-start-1 grid h-[64px] w-[64px] place-items-center rounded-full bg-floating-core shadow-inner">
            <span className="text-xl font-semibold leading-none">{stats.percent}</span>
            <span className="-mt-4 text-[10px] font-medium uppercase text-floating-label">mem</span>
          </span>
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
