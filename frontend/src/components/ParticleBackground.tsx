'use client';

import { useEffect, useRef } from 'react';

/**
 * Floating particle canvas — ported from Tekken 8 bg.js (createjs + particlejs).
 * Renders crimson-hued particles drifting upward on a transparent canvas.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  alphaDecay: number;
  hue: number;
  saturation: number;
  luminance: number;
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: Particle[] = [];
    const MAX_PARTICLES = 80;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function spawnParticle(): Particle {
      const w = canvas!.width;
      const h = canvas!.height;
      return {
        x: Math.random() * w * 1.4 - w * 0.2,
        y: h + Math.random() * 100,
        vx: (Math.random() - 0.6) * 1.2,
        vy: -(1.5 + Math.random() * 3),
        size: 1 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.4,
        alphaDecay: 0.001 + Math.random() * 0.003,
        hue: 340 + (Math.random() - 0.5) * 20,
        saturation: 72 + Math.random() * 19,
        luminance: 29 + Math.random() * 16,
      };
    }

    // Pre-seed
    for (let i = 0; i < MAX_PARTICLES / 2; i++) {
      const p = spawnParticle();
      p.y = Math.random() * canvas.height;
      particles.push(p);
    }

    let lastSpawn = 0;
    const SPAWN_INTERVAL = 200; // ms per new particle — matches reference emitFrequency

    function tick(time: number) {
      const w = canvas!.width;
      const h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);

      // Spawn
      if (time - lastSpawn > SPAWN_INTERVAL && particles.length < MAX_PARTICLES) {
        particles.push(spawnParticle());
        lastSpawn = time;
      }

      // Update + draw
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.alphaDecay;

        if (p.alpha <= 0 || p.y < -20) {
          particles.splice(i, 1);
          continue;
        }

        ctx!.globalCompositeOperation = 'lighter';
        ctx!.beginPath();
        const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 6);
        gradient.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, ${p.luminance}%, ${p.alpha})`);
        gradient.addColorStop(1, `hsla(${p.hue}, ${p.saturation}%, ${p.luminance}%, 0)`);
        ctx!.fillStyle = gradient;
        ctx!.arc(p.x, p.y, p.size * 6, 0, Math.PI * 2);
        ctx!.fill();
      }

      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
