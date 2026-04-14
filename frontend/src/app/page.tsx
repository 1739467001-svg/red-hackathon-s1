'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Swords } from 'lucide-react';
import { useSimulationStore } from '@/stores/simulation-store';

const MAX_IDEAS = 4;

const PLACEHOLDERS = [
  '输入你的第一个想法...',
  '输入你的第二个想法...',
  '输入你的第三个想法...',
  '输入你的第四个想法...',
];

export default function Home() {
  const router = useRouter();
  const startSimulation = useSimulationStore((s) => s.startSimulation);

  const nextId = useRef(1);
  const [ideas, setIdeas] = useState<{ id: number; text: string }[]>([{ id: 0, text: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddMore = ideas.length < MAX_IDEAS;
  const canRemove = ideas.length > 1;

  function addIdea() {
    if (canAddMore) {
      setIdeas((prev) => [...prev, { id: nextId.current++, text: '' }]);
    }
  }

  function removeIdea(id: number) {
    if (canRemove) {
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
    }
  }

  function updateIdea(id: number, value: string) {
    setIdeas((prev) => prev.map((idea) => (idea.id === id ? { ...idea, text: value } : idea)));
  }

  async function handleSubmit() {
    const nonEmpty = ideas.map((i) => i.text.trim()).filter(Boolean);
    if (nonEmpty.length === 0) {
      setError('请至少输入一个想法');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await startSimulation(nonEmpty);
      router.push('/simulation');
    } catch {
      setError('启动模拟失败，请重试');
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ zIndex: 2 }}>
      {/* ===== Hero Section — KV background like Tekken 8 top ===== */}
      <section className="relative flex items-center justify-center overflow-hidden" style={{ height: '56.25vw', maxHeight: '680px', minHeight: '400px' }}>
        {/* KV background image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'url(/images/kv_pc_v2.jpg) center center no-repeat',
            backgroundSize: 'cover',
            transform: 'scale(0.965)',
          }}
        />
        {/* Bottom gradient fade */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '150px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 100%)',
          }}
        />

        {/* Hero content overlay — offset left to avoid covering character art */}
        <div className="relative z-10 text-center" style={{ marginLeft: '-40%' }}>
          <h1
            style={{
              fontFamily: 'var(--rs-font-display)',
              fontWeight: 500,
              fontSize: 'clamp(48px, 8vw, 100px)',
              letterSpacing: '12px',
              color: '#fff',
              lineHeight: 1,
              textShadow: '0 0 60px rgba(245, 10, 100, 0.5), 0 0 120px rgba(63, 209, 231, 0.3)',
            }}
          >
            HinH
          </h1>
          <p
            className="mt-4"
            style={{
              fontFamily: 'var(--rs-font-mono)',
              fontSize: '14px',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: 'var(--tk-cyan)',
            }}
          >
            AI-DRIVEN HACKATHON SIMULATION
          </p>
          <p
            className="mt-2"
            style={{
              fontFamily: 'var(--rs-font-display)',
              fontSize: 'clamp(14px, 2vw, 22px)',
              fontWeight: 200,
              letterSpacing: '8px',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            GET READY FOR THE NEXT HACK
          </p>
        </div>
      </section>

      {/* ===== Decorative character illustrations — like Tekken 8 story section ===== */}
      <section className="relative" style={{ background: '#000' }}>
        {/* Jin (left) and Kazuya (right) flanking the form — like Tekken 8 story */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
          {/* Jin — left side, red lightning */}
          <img
            src="/images/img_jin_pc.webp"
            alt=""
            style={{
              position: 'absolute',
              left: '-5%',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 'clamp(200px, 30vw, 500px)',
              opacity: 0.35,
              filter: 'blur(1px)',
            }}
          />
          {/* Kazuya — right side, blue lightning */}
          <img
            src="/images/img_kazuya_pc.webp"
            alt=""
            style={{
              position: 'absolute',
              right: '-5%',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 'clamp(200px, 30vw, 500px)',
              opacity: 0.35,
              filter: 'blur(1px)',
            }}
          />
        </div>

        {/* Pink diagonal accent — from bg_about_pc.png style */}
        <div
          className="pointer-events-none absolute"
          style={{
            top: 0,
            right: 0,
            width: '40%',
            height: '100%',
            background: 'linear-gradient(135deg, transparent 50%, rgba(245, 10, 100, 0.06) 50%)',
            zIndex: 0,
          }}
        />

        {/* Form content */}
        <div className="relative mx-auto max-w-2xl px-4 py-16" style={{ zIndex: 2 }}>
          {/* Cyan accent line */}
          <div
            className="mx-auto mb-10 w-full"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--tk-cyan-40), transparent)',
            }}
          />

          {/* Section title */}
          <div className="mb-6 flex justify-center">
            <div
              style={{
                display: 'inline-block',
                padding: '6px 32px 8px',
                background: 'var(--tk-pink)',
                transform: 'skewX(-12deg)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--rs-font-display)',
                  fontSize: '18px',
                  fontWeight: 400,
                  letterSpacing: '4px',
                  color: '#fff',
                  display: 'block',
                  transform: 'skewX(12deg)',
                }}
              >
                请输入你的创意
              </span>
            </div>
          </div>

          {/* Idea input section */}
          <div className="space-y-4">
            {ideas.map((idea, index) => (
              <div key={idea.id} className="relative">
                {/* Numbered badge — pink skewed */}
                <span
                  className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center text-xs"
                  style={{
                    fontFamily: 'var(--rs-font-mono)',
                    backgroundColor: 'var(--tk-pink)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    transform: 'skewX(-8deg)',
                  }}
                >
                  {index + 1}
                </span>
                <textarea
                  value={idea.text}
                  onChange={(e) => updateIdea(idea.id, e.target.value)}
                  placeholder={PLACEHOLDERS[index]}
                  rows={2}
                  className="w-full resize-none pl-10 pr-8 py-3 text-sm transition-all duration-200"
                  style={{
                    fontFamily: 'var(--rs-font-mono)',
                    backgroundColor: 'rgba(2, 1, 8, 0.7)',
                    border: '1px solid var(--tk-cyan-20)',
                    color: '#fff',
                    borderRadius: '0px',
                    outline: 'none',
                    backdropFilter: 'blur(4px)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--tk-cyan)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(63, 209, 231, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--tk-cyan-20)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => removeIdea(idea.id)}
                    className="absolute right-2 top-2 cursor-pointer p-1 transition-colors duration-200"
                    style={{ color: 'var(--rs-gray)' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = 'var(--tk-pink)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = 'var(--rs-gray)')
                    }
                    aria-label="移除这个想法"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}

            {/* Add more button */}
            {canAddMore && (
              <button
                type="button"
                onClick={addIdea}
                className="flex w-full cursor-pointer items-center justify-center gap-2 px-4 py-3 text-sm transition-all duration-200"
                style={{
                  fontFamily: 'var(--rs-font-mono)',
                  backgroundColor: 'transparent',
                  color: 'var(--tk-cyan)',
                  border: '1px solid var(--tk-cyan-20)',
                  borderRadius: '0px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--tk-cyan)';
                  e.currentTarget.style.boxShadow = '0 0 10px var(--tk-cyan-glow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--tk-cyan-20)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Plus size={18} />
                添加更多想法
              </button>
            )}
          </div>

          {/* Error message */}
          {error && (
            <p
              className="mt-4 text-center text-sm"
              style={{
                fontFamily: 'var(--rs-font-mono)',
                color: 'var(--tk-pink)',
              }}
            >
              {error}
            </p>
          )}

          {/* Cyan accent line */}
          <div
            className="mt-8 mb-8 w-full"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--tk-cyan-40), transparent)',
            }}
          />

          {/* Start button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="tk-btn cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontSize: '16px', padding: '14px 48px 16px' }}
            >
              <span className="flex items-center gap-3">
                {isLoading ? (
                  <span
                    style={{
                      fontFamily: 'var(--rs-font-mono)',
                      animation: 'pulse 2s ease-in-out infinite',
                      fontSize: '14px',
                    }}
                  >
                    INITIALIZING...
                  </span>
                ) : (
                  <>
                    <Swords size={20} />
                    开始模拟
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
