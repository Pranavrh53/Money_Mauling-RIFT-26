import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';
import './LandingPage.css';

// ════════════════════════════════════════════════════════════════════════════
// PARTICLE NETWORK CANVAS — animated transaction graph background
// ════════════════════════════════════════════════════════════════════════════
function ParticleNetwork({ width, height }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const PARTICLE_COUNT = 80;
    const CONNECTION_DIST = 160;

    // Initialize particles
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: Math.random() * 2 + 1.5,
          isSuspicious: Math.random() < 0.15,
        });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      const particles = particlesRef.current;

      // Update positions
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        p.x = Math.max(0, Math.min(width, p.x));
        p.y = Math.max(0, Math.min(height, p.y));
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.35;
            const isSusp = particles[i].isSuspicious || particles[j].isSuspicious;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = isSusp
              ? `rgba(0, 212, 255, ${alpha})`
              : `rgba(100, 160, 220, ${alpha * 0.5})`;
            ctx.lineWidth = isSusp ? 1.2 : 0.6;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        if (p.isSuspicious) {
          ctx.fillStyle = '#00D4FF';
          ctx.shadowColor = '#00D4FF';
          ctx.shadowBlur = 12;
        } else {
          ctx.fillStyle = 'rgba(148, 180, 220, 0.6)';
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="lp-particle-canvas"
      style={{ width, height }}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ANIMATED COUNTER
// ════════════════════════════════════════════════════════════════════════════
function AnimatedCounter({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return (
    <span ref={ref} className="lp-counter-value">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FEATURE CARD ICONS (animated SVG/CSS)
// ════════════════════════════════════════════════════════════════════════════
function CycleIcon() {
  return (
    <div className="lp-icon-wrap lp-icon-cycle">
      <svg viewBox="0 0 64 64" className="lp-icon-svg">
        <circle cx="32" cy="10" r="5" fill="#A855F7" />
        <circle cx="52" cy="46" r="5" fill="#A855F7" />
        <circle cx="12" cy="46" r="5" fill="#A855F7" />
        <path d="M36 12 L49 42" stroke="#A855F7" strokeWidth="2" fill="none" strokeDasharray="4 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.5s" repeatCount="indefinite" />
        </path>
        <path d="M49 49 L15 49" stroke="#A855F7" strokeWidth="2" fill="none" strokeDasharray="4 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.5s" repeatCount="indefinite" />
        </path>
        <path d="M15 42 L28 12" stroke="#A855F7" strokeWidth="2" fill="none" strokeDasharray="4 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.5s" repeatCount="indefinite" />
        </path>
        {/* Arrow heads */}
        <polygon points="48,40 52,44 46,44" fill="#A855F7">
          <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
        </polygon>
        <polygon points="16,50 12,46 18,46" fill="#A855F7" transform="rotate(180 15 48)">
          <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
        </polygon>
      </svg>
    </div>
  );
}

function SmurfingIcon() {
  return (
    <div className="lp-icon-wrap lp-icon-smurf">
      <svg viewBox="0 0 64 64" className="lp-icon-svg">
        {/* Center aggregator */}
        <circle cx="32" cy="32" r="7" fill="#06B6D4" />
        {/* Scatter dots fan-in */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const cx = 32 + Math.cos(rad) * 24;
          const cy = 32 + Math.sin(rad) * 24;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r="3" fill="#06B6D4" opacity="0.7">
                <animate attributeName="r" values="3;4;3" dur={`${1 + i * 0.15}s`} repeatCount="indefinite" />
              </circle>
              <line x1={cx} y1={cy} x2="32" y2="32" stroke="#06B6D4" strokeWidth="1" opacity="0.3" strokeDasharray="3 3">
                <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1.2s" repeatCount="indefinite" />
              </line>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ShellIcon() {
  return (
    <div className="lp-icon-wrap lp-icon-shell">
      <svg viewBox="0 0 64 64" className="lp-icon-svg">
        {/* Chain links */}
        <rect x="4" y="26" width="12" height="12" rx="3" fill="none" stroke="#F97316" strokeWidth="2" />
        <rect x="26" y="26" width="12" height="12" rx="3" fill="none" stroke="#F97316" strokeWidth="2" />
        <rect x="48" y="26" width="12" height="12" rx="3" fill="none" stroke="#F97316" strokeWidth="2" />
        {/* Connectors */}
        <line x1="16" y1="32" x2="26" y2="32" stroke="#F97316" strokeWidth="2" strokeDasharray="3 2">
          <animate attributeName="stroke-dashoffset" from="0" to="-10" dur="1s" repeatCount="indefinite" />
        </line>
        <line x1="38" y1="32" x2="48" y2="32" stroke="#F97316" strokeWidth="2" strokeDasharray="3 2">
          <animate attributeName="stroke-dashoffset" from="0" to="-10" dur="1s" repeatCount="indefinite" />
        </line>
        {/* Arrows */}
        <polygon points="24,29 24,35 27,32" fill="#F97316">
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
        </polygon>
        <polygon points="46,29 46,35 49,32" fill="#F97316">
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
        </polygon>
      </svg>
    </div>
  );
}

function GaugeIcon() {
  return (
    <div className="lp-icon-wrap lp-icon-gauge">
      <svg viewBox="0 0 64 64" className="lp-icon-svg">
        {/* Gauge arc */}
        <path d="M12 44 A24 24 0 0 1 52 44" fill="none" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
        <path d="M12 44 A24 24 0 0 1 52 44" fill="none" stroke="url(#gaugeGrad)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray="75.4" strokeDashoffset="75.4">
          <animate attributeName="stroke-dashoffset" from="75.4" to="18" dur="2s" fill="freeze" repeatCount="indefinite" />
        </path>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        {/* Needle */}
        <line x1="32" y1="44" x2="32" y2="22" stroke="#00FFD1" strokeWidth="2.5" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="-90 32 44" to="45 32 44" dur="2s" repeatCount="indefinite" />
        </line>
        <circle cx="32" cy="44" r="4" fill="#00FFD1" />
      </svg>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN LANDING PAGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const FEATURES = [
  {
    title: 'Cycle Detection',
    desc: 'Identify circular fund routing where money flows A → B → C → A through 3–5 account loops.',
    Icon: CycleIcon,
    color: '#A855F7',
  },
  {
    title: 'Smurfing Detection',
    desc: 'Detect fan-in / fan-out patterns where small deposits aggregate and disperse within 72-hour windows.',
    Icon: SmurfingIcon,
    color: '#06B6D4',
  },
  {
    title: 'Shell Chain Analysis',
    desc: 'Trace layered shell networks with low-activity intermediaries hiding the money trail across 3+ hops.',
    Icon: ShellIcon,
    color: '#F97316',
  },
  {
    title: 'Risk Intelligence',
    desc: 'Multi-factor weighted scoring model combining centrality, velocity, ring density, and volume anomalies.',
    Icon: GaugeIcon,
    color: '#00FFD1',
  },
];

export default function LandingPage({ onGetStarted }) {
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="lp-root">
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <ParticleNetwork width={dims.w} height={dims.h} />

        <div className="lp-hero-overlay" />

        <motion.div
          className="lp-hero-content"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div className="lp-logo-row" variants={fadeUp} custom={0}>
            <span className="lp-logo-icon">◈</span>
            <span className="lp-logo-text">Graphora</span>
          </motion.div>

          <motion.h1 className="lp-headline" variants={fadeUp} custom={1}>
            Detect Money Laundering Networks<br />
            with <span className="lp-gradient-text">Graph Analysis</span>
          </motion.h1>

          <motion.p className="lp-subheadline" variants={fadeUp} custom={2}>
            <span className="lp-chip">⚡ Real-time Detection</span>
            <span className="lp-chip">🎯 99% Accuracy</span>
            <span className="lp-chip">🌐 Visual Graph Analysis</span>
          </motion.p>

          <motion.button
            className="lp-cta"
            variants={fadeUp}
            custom={3}
            onClick={onGetStarted}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Get Started
            <span className="lp-cta-arrow">→</span>
          </motion.button>
        </motion.div>

        <motion.div
          className="lp-scroll-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
        >
          <span>Scroll to explore</span>
          <div className="lp-scroll-chevron" />
        </motion.div>
      </section>

      {/* ── COUNTERS ──────────────────────────────────────────────────── */}
      <section className="lp-counters">
        <motion.div
          className="lp-counters-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          {[
            { value: 30, suffix: 's', label: 'Processing Time', sub: '10K transactions' },
            { value: 96, suffix: '%', label: 'Precision', sub: '≥70% target' },
            { value: 98, suffix: '%', label: 'Recall', sub: '≥60% target' },
            { value: 0, suffix: '', label: 'False Positives', sub: 'Merchant & payroll safe' },
          ].map((item, i) => (
            <motion.div className="lp-counter-card" key={i} variants={fadeUp} custom={i}>
              {item.label === 'Processing Time' ? (
                <span className="lp-counter-value">≤{item.value}{item.suffix}</span>
              ) : item.label === 'False Positives' ? (
                <span className="lp-counter-value">{item.value}</span>
              ) : (
                <AnimatedCounter target={item.value} suffix={item.suffix} />
              )}
              <span className="lp-counter-label">{item.label}</span>
              {item.sub && <span className="lp-counter-sub">{item.sub}</span>}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section className="lp-features">
        <motion.h2
          className="lp-section-title"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          Detection <span className="lp-gradient-text">Capabilities</span>
        </motion.h2>

        <motion.div
          className="lp-features-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              className="lp-feature-card"
              key={i}
              variants={fadeUp}
              custom={i}
              whileHover={{ y: -6, boxShadow: `0 12px 40px ${f.color}22` }}
              style={{ '--accent': f.color }}
            >
              <f.Icon />
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="lp-how">
        <motion.h2
          className="lp-section-title"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          How <span className="lp-gradient-text">It Works</span>
        </motion.h2>

        <motion.div
          className="lp-steps"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          {[
            { step: '01', title: 'Upload CSV', desc: 'Import your transaction dataset with sender, receiver, amount, and timestamp columns.' },
            { step: '02', title: 'Build Graph', desc: 'Graphora builds a directed transaction network and precomputes all graph metrics.' },
            { step: '03', title: 'Detect Patterns', desc: 'Three detection engines analyze cycles, smurfing patterns, and shell chain networks.' },
            { step: '04', title: 'Investigate', desc: 'Visualize the network, rank accounts by risk, and drill into fraud rings interactively.' },
          ].map((s, i) => (
            <motion.div className="lp-step" key={i} variants={fadeUp} custom={i}>
              <span className="lp-step-num">{s.step}</span>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────────── */}
      <section className="lp-cta-section">
        <motion.div
          className="lp-cta-box"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2>Ready to Uncover Hidden Networks?</h2>
          <p>Upload your transaction data and let Graphora's AI reveal the patterns humans can't see.</p>
          <motion.button
            className="lp-cta lp-cta-lg"
            onClick={onGetStarted}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Launch Dashboard
            <span className="lp-cta-arrow">→</span>
          </motion.button>
        </motion.div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="lp-logo-icon">◈</span>
            <span className="lp-logo-text">Graphora</span>
            <p className="lp-footer-tagline">AI-Powered Financial Crime Detection Platform</p>
          </div>

          <div className="lp-footer-links">
            <div className="lp-footer-col">
              <h5>Platform</h5>
              <span>Dashboard</span>
              <span>Graph Visualization</span>
              <span>Risk Intelligence</span>
              <span>API Documentation</span>
            </div>
            <div className="lp-footer-col">
              <h5>Detection</h5>
              <span>Cycle Analysis</span>
              <span>Smurfing Patterns</span>
              <span>Shell Networks</span>
              <span>Continuous Monitoring</span>
            </div>
            <div className="lp-footer-col">
              <h5>Compliance</h5>
              <span>AML Guidelines</span>
              <span>KYC Integration</span>
              <span>Audit Trail</span>
              <span>Data Privacy</span>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <div className="lp-compliance-badges">
            <span className="lp-badge">🛡️ AML Compliant</span>
            <span className="lp-badge">🔒 SOC 2 Ready</span>
            <span className="lp-badge">✅ GDPR Aware</span>
          </div>
          <p className="lp-copyright">© 2026 Graphora — Built for RIFT Hackathon</p>
        </div>
      </footer>
    </div>
  );
}
