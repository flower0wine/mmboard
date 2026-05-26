import { FloatingBall } from './components/floating-ball/FloatingBall';

export function App() {
  if (window.location.hash === '#/floating-ball') {
    return <FloatingBall />;
  }

  return <main className="h-screen w-screen bg-transparent" />;
}
