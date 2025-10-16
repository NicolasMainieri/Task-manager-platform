import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, CheckCircle, Zap, Users, BarChart3, Brain, ArrowRight, Star } from 'lucide-react';
import LiquidEther from '../components/LiquidEther';

// Utility functions
const throttle = <T extends (...args: any[]) => any>(func: T, limit: number) => {
  let lastCall = 0;
  return function (this: any, ...args: Parameters<T>) {
    const now = performance.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16)
  };
}

const darkenColor = (hex: string, percent: number): string => {
  let color = hex.startsWith('#') ? hex.slice(1) : hex;
  if (color.length === 3) {
    color = color
      .split('')
      .map((c: string) => c + c)
      .join('');
  }
  const num = parseInt(color, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

// Folder Component
interface FolderProps {
  color?: string;
  size?: number;
  items?: (string | null)[];
  className?: string;
}

const Folder = ({ color = '#5227FF', size = 1, items = [], className = '' }: FolderProps) => {
  const maxItems = 3;
  const papers: (string | null)[] = items.slice(0, maxItems);
  while (papers.length < maxItems) {
    papers.push(null);
  }
  const [open, setOpen] = useState(false);
  const [paperOffsets, setPaperOffsets] = useState(Array.from({ length: maxItems }, () => ({ x: 0, y: 0 })));
  const folderBackColor = darkenColor(color, 0.08);
  const paper1 = darkenColor('#ffffff', 0.1);
  const paper2 = darkenColor('#ffffff', 0.05);
  const paper3 = '#ffffff';

  const handleClick = () => {
    setOpen(prev => !prev);
    if (open) {
      setPaperOffsets(Array.from({ length: maxItems }, () => ({ x: 0, y: 0 })));
    }
  };

  const handlePaperMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (!open) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = (e.clientX - centerX) * 0.15;
    const offsetY = (e.clientY - centerY) * 0.15;
    setPaperOffsets(prev => {
      const newOffsets = [...prev];
      newOffsets[index] = { x: offsetX, y: offsetY };
      return newOffsets;
    });
  };

  const handlePaperMouseLeave = (_e: React.MouseEvent<HTMLDivElement>, index: number) => {
    setPaperOffsets(prev => {
      const newOffsets = [...prev];
      newOffsets[index] = { x: 0, y: 0 };
      return newOffsets;
    });
  };

  const folderClassName = `folder ${open ? 'open' : ''}`.trim();
  const scaleStyle = { transform: `scale(${size})`, transformOrigin: 'center' };

  return (
    <div style={scaleStyle} className={className}>
      <style>{`
        .folder {
          transition: all 0.2s ease-in;
          cursor: pointer;
          display: inline-block;
        }
        .folder:not(.folder--click):hover {
          transform: translateY(-8px);
        }
        .folder:not(.folder--click):hover .paper {
          transform: translate(-50%, 0%);
        }
        .folder:not(.folder--click):hover .folder__front {
          transform: skew(15deg) scaleY(0.6);
        }
        .folder:not(.folder--click):hover .right {
          transform: skew(-15deg) scaleY(0.6);
        }
        .folder.open {
          transform: translateY(-8px);
        }
        .folder.open .paper:nth-child(1) {
          transform: translate(-120%, -70%) rotateZ(-15deg);
        }
        .folder.open .paper:nth-child(1):hover {
          transform: translate(-120%, -70%) rotateZ(-15deg) scale(1.1);
        }
        .folder.open .paper:nth-child(2) {
          transform: translate(10%, -70%) rotateZ(15deg);
          height: 80%;
        }
        .folder.open .paper:nth-child(2):hover {
          transform: translate(10%, -70%) rotateZ(15deg) scale(1.1);
        }
        .folder.open .paper:nth-child(3) {
          transform: translate(-50%, -100%) rotateZ(5deg);
          height: 80%;
        }
        .folder.open .paper:nth-child(3):hover {
          transform: translate(-50%, -100%) rotateZ(5deg) scale(1.1);
        }
        .folder.open .folder__front {
          transform: skew(15deg) scaleY(0.6);
        }
        .folder.open .right {
          transform: skew(-15deg) scaleY(0.6);
        }
        .folder__back {
          position: relative;
          width: 100px;
          height: 80px;
          background: ${folderBackColor};
          border-radius: 0px 10px 10px 10px;
        }
        .folder__back::after {
          position: absolute;
          z-index: 0;
          bottom: 98%;
          left: 0;
          content: '';
          width: 30px;
          height: 10px;
          background: ${folderBackColor};
          border-radius: 5px 5px 0 0;
        }
        .paper {
          position: absolute;
          z-index: 2;
          bottom: 10%;
          left: 50%;
          transform: translate(-50%, 10%);
          width: 70%;
          height: 80%;
          background: ${paper1};
          border-radius: 10px;
          transition: all 0.3s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #333;
          padding: 4px;
          overflow: hidden;
        }
        .paper:nth-child(2) {
          background: ${paper2};
          width: 80%;
          height: 70%;
        }
        .paper:nth-child(3) {
          background: ${paper3};
          width: 90%;
          height: 60%;
        }
        .folder__front {
          position: absolute;
          z-index: 3;
          width: 100%;
          height: 100%;
          background: ${color};
          border-radius: 5px 10px 10px 10px;
          transform-origin: bottom;
          transition: all 0.3s ease-in-out;
        }
      `}</style>
      <div className={folderClassName} onClick={handleClick}>
        <div className="folder__back">
          {papers.map((item, i) => (
            <div
              key={`paper-${i}`}
              className={`paper paper-${i + 1}`}
              onMouseMove={e => handlePaperMouseMove(e, i)}
              onMouseLeave={e => handlePaperMouseLeave(e, i)}
              style={
                open
                  ? {
                      transform: `translate(calc(-50% + ${paperOffsets[i]?.x || 0}px), calc(10% + ${paperOffsets[i]?.y || 0}px))`
                    }
                  : {}
              }
            >
              {item || ''}
            </div>
          ))}
          <div className="folder__front"></div>
          <div className="folder__front right"></div>
        </div>
      </div>
    </div>
  );
};

// DotGrid Component
interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  shockRadius?: number;
  shockStrength?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface Dot {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  _inertiaApplied: boolean;
}

const DotGrid = ({
  dotSize = 16,
  gap = 32,
  baseColor = '#5227FF',
  activeColor = '#5227FF',
  proximity = 150,
  shockRadius = 250,
  shockStrength = 5,
  className = '',
  style
}: DotGridProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const pointerRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    lastTime: 0,
    lastX: 0,
    lastY: 0
  });

  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor]);
  const activeRgb = useMemo(() => hexToRgb(activeColor), [activeColor]);

  const circlePath = useMemo(() => {
    if (typeof window === 'undefined' || !window.Path2D) return null;
    const p = new window.Path2D();
    p.arc(0, 0, dotSize / 2, 0, Math.PI * 2);
    return p;
  }, [dotSize]);

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const cols = Math.floor((width + gap) / (dotSize + gap));
    const rows = Math.floor((height + gap) / (dotSize + gap));
    const cell = dotSize + gap;

    const gridW = cell * cols - gap;
    const gridH = cell * rows - gap;

    const extraX = width - gridW;
    const extraY = height - gridH;

    const startX = extraX / 2 + dotSize / 2;
    const startY = extraY / 2 + dotSize / 2;

    const dots = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = startX + x * cell;
        const cy = startY + y * cell;
        dots.push({ cx, cy, xOffset: 0, yOffset: 0, _inertiaApplied: false });
      }
    }
    dotsRef.current = dots;
  }, [dotSize, gap]);

  useEffect(() => {
    if (!circlePath) return;

    let rafId: number;
    const proxSq = proximity * proximity;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x: px, y: py } = pointerRef.current;

      for (const dot of dotsRef.current) {
        const ox = dot.cx + dot.xOffset;
        const oy = dot.cy + dot.yOffset;
        const dx = dot.cx - px;
        const dy = dot.cy - py;
        const dsq = dx * dx + dy * dy;

        let style = baseColor;
        if (dsq <= proxSq) {
          const dist = Math.sqrt(dsq);
          const t = 1 - dist / proximity;
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
          style = `rgb(${r},${g},${b})`;
        }

        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillStyle = style;
        ctx.fill(circlePath);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [proximity, baseColor, activeRgb, baseRgb, circlePath]);

  useEffect(() => {
    buildGrid();
    let ro: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(buildGrid);
      wrapperRef.current && ro.observe(wrapperRef.current);
    } else {
      window.addEventListener('resize', buildGrid);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', buildGrid);
    };
  }, [buildGrid]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      const pr = pointerRef.current;
      const dt = pr.lastTime ? now - pr.lastTime : 16;
      const dx = e.clientX - pr.lastX;
      const dy = e.clientY - pr.lastY;
      let vx = (dx / dt) * 1000;
      let vy = (dy / dt) * 1000;
      let speed = Math.hypot(vx, vy);
      
      const maxSpeed = 5000;
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        vx *= scale;
        vy *= scale;
        speed = maxSpeed;
      }
      
      pr.lastTime = now;
      pr.lastX = e.clientX;
      pr.lastY = e.clientY;
      pr.vx = vx;
      pr.vy = vy;
      pr.speed = speed;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      pr.x = e.clientX - rect.left;
      pr.y = e.clientY - rect.top;

      const speedTrigger = 100;
      if (speed > speedTrigger) {
        for (const dot of dotsRef.current) {
          const dist = Math.hypot(dot.cx - pr.x, dot.cy - pr.y);
          if (dist < proximity && !dot._inertiaApplied) {
            dot._inertiaApplied = true;
            const pushX = (dot.cx - pr.x) * 0.3 + vx * 0.01;
            const pushY = (dot.cy - pr.y) * 0.3 + vy * 0.01;
            
            animateDotReturn(dot, pushX, pushY);
          }
        }
      }
    };

    const animateDotReturn = (dot: Dot, startX: number, startY: number) => {
      const startTime = performance.now();
      const duration = 1500;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * (Math.PI * 2) / 3);
        
        dot.xOffset = startX * (1 - eased);
        dot.yOffset = startY * (1 - eased);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          dot.xOffset = 0;
          dot.yOffset = 0;
          dot._inertiaApplied = false;
        }
      };
      
      requestAnimationFrame(animate);
    };

    const onClick = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      
      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
        if (dist < shockRadius && !dot._inertiaApplied) {
          dot._inertiaApplied = true;
          const falloff = Math.max(0, 1 - dist / shockRadius);
          const pushX = (dot.cx - cx) * shockStrength * falloff;
          const pushY = (dot.cy - cy) * shockStrength * falloff;
          
          animateDotReturn(dot, pushX, pushY);
        }
      }
    };

    const throttledMove = throttle(onMove, 16);
    window.addEventListener('mousemove', throttledMove, { passive: true });
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('mousemove', throttledMove);
      window.removeEventListener('click', onClick);
    };
  }, [proximity, shockRadius, shockStrength]);

  return (
    <div className={className} style={style}>
      <div ref={wrapperRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
      </div>
    </div>
  );
};

// Landing Page Component
export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  // ✅ Funzione per andare al login normale
  const handleNavigateToLogin = () => {
    navigate('/login', { state: { view: 'login' } });
  };

  // ✅ Funzione per andare alla registrazione azienda
  const handleNavigateToRegisterCompany = () => {
    navigate('/login', { state: { view: 'register-admin' } });
  };

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI-Powered Insights",
      description: "Analisi intelligente delle performance e suggerimenti automatici per ottimizzare il workflow"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Team Collaboration",
      description: "Gestione team avanzata con ruoli, permessi e assegnazioni intelligenti"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Analytics Avanzate",
      description: "Dashboard interattive con metriche in tempo reale e report personalizzabili"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Automazione Smart",
      description: "Automatizza task ripetitivi e workflow con regole intelligenti"
    }
  ];

  const plans = [
    {
      name: "Starter",
      price: { monthly: 19.99, yearly: 199.90 },
      description: "Perfetto per freelancer e piccoli team",
      features: [
        "Fino a 10 utenti",
        "500 task/mese",
        "Dashboard & Analytics base",
        "Gestione team e permessi",
        "Note e Whiteboard",
        "Calendario integrato",
        "Supporto email"
      ],
      popular: false,
      color: "#3b82f6",
      folderItems: ["10 Users", "500 Tasks", "Basic"]
    },
    {
      name: "Professional",
      price: { monthly: 99.99, yearly: 999.90 },
      description: "Per team in crescita con esigenze avanzate",
      features: [
        "Fino a 50 utenti",
        "Task illimitati",
        "AI Analytics avanzate",
        "Sistema ticket completo",
        "Videochiamate integrate",
        "Integrazioni email (Gmail/Outlook)",
        "Calendario Google/Outlook",
        "Timer e tracking lavoro",
        "Report personalizzati",
        "Supporto prioritario"
      ],
      popular: true,
      color: "#a855f7",
      folderItems: ["50 Users", "Unlimited", "AI Pro"]
    },
    {
      name: "Enterprise",
      price: null,
      description: "Soluzione su misura per grandi organizzazioni",
      features: [
        "Utenti illimitati",
        "Task e storage illimitati",
        "AI Chatbot completo",
        "Videochiamate illimitate",
        "Tutte le integrazioni",
        "API access completo",
        "Custom branding",
        "SSO & Advanced security",
        "Supporto dedicato 24/7",
        "Onboarding personalizzato",
        "SLA garantiti"
      ],
      popular: false,
      color: "#ec4899",
      folderItems: ["Unlimited", "Full AI", "24/7"]
    }
  ];

  const testimonials = [
    {
      name: "Marco Rossi",
      role: "CEO @ TechStart",
      content: "Planora ha trasformato completamente il nostro modo di lavorare. L'AI è incredibilmente accurata.",
      rating: 5
    },
    {
      name: "Laura Bianchi",
      role: "Project Manager @ DesignCo",
      content: "Finalmente uno strumento che capisce davvero le esigenze del team. Imprescindibile!",
      rating: 5
    },
    {
      name: "Giovanni Verdi",
      role: "CTO @ DevHub",
      content: "Le analytics e i report automatici ci hanno fatto risparmiare ore ogni settimana.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen relative">
      {/* LiquidEther Background - Fixed per tutta la pagina */}
      <div className="fixed inset-0 z-0">
        <LiquidEther
          colors={['#5227FF', '#FF9FFC', '#B19EEF']}
          mouseForce={20}
          cursorSize={100}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Overlay gradient per migliore leggibilità */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900/70 via-purple-900/60 to-slate-900/70 z-0"></div>

      {/* Content con z-index superiore */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="fixed w-full bg-slate-900/80 backdrop-blur-lg z-50 border-b border-purple-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Planora</span>
              </div>

              {/* Desktop Menu */}
              <div className="hidden md:flex items-center space-x-8">
                <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
                <a href="#pricing" className="text-gray-300 hover:text-white transition">Pricing</a>
                <a href="#testimonials" className="text-gray-300 hover:text-white transition">Testimonials</a>
                <button 
                  onClick={handleNavigateToLogin}
                  className="text-gray-300 hover:text-white transition font-medium"
                >
                  Login
                </button>
                <button 
                  onClick={handleNavigateToRegisterCompany}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition"
                >
                  Inizia Gratis
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button 
                className="md:hidden text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-slate-900 border-t border-purple-500/20">
              <div className="px-4 py-4 space-y-3">
                <a href="#features" className="block text-gray-300 hover:text-white">Features</a>
                <a href="#pricing" className="block text-gray-300 hover:text-white">Pricing</a>
                <a href="#testimonials" className="block text-gray-300 hover:text-white">Testimonials</a>
                <button 
                  onClick={handleNavigateToLogin}
                  className="block w-full text-left text-gray-300 hover:text-white"
                >
                  Login
                </button>
                <button 
                  onClick={handleNavigateToRegisterCompany}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg"
                >
                  Inizia Gratis
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-block mb-4 px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/30">
              <span className="text-purple-300 text-sm font-medium">🚀 Nuova AI Assistant disponibile ora</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Gestione Task con
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Super Poteri AI</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Organizza, collabora e ottimizza il lavoro del tuo team con l'intelligenza artificiale. 
              Analytics avanzate, automazione intelligente e insights predittivi.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button 
                onClick={handleNavigateToRegisterCompany}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition flex items-center justify-center gap-2"
              >
                Inizia Gratis 14 Giorni
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/20 transition border border-white/20">
                Guarda Demo
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-gray-400 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Nessuna carta richiesta</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Setup in 2 minuti</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Cancella quando vuoi</span>
              </div>
            </div>

            {/* Stats Section */}
            <div className="mt-16 grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm p-8 rounded-2xl border border-purple-500/30 hover:border-purple-500/50 transition group">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-12 h-12 text-purple-400 group-hover:scale-110 transition" />
                  <div className="text-right">
                    <div className="text-4xl font-bold text-white">10k+</div>
                    <div className="text-sm text-gray-400">Team Attivi</div>
                  </div>
                </div>
                <p className="text-gray-300 text-sm">Team di ogni dimensione si affidano a Planora per gestire i loro progetti</p>
              </div>

              <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 backdrop-blur-sm p-8 rounded-2xl border border-pink-500/30 hover:border-pink-500/50 transition group">
                <div className="flex items-center justify-between mb-4">
                  <Zap className="w-12 h-12 text-pink-400 group-hover:scale-110 transition" />
                  <div className="text-right">
                    <div className="text-4xl font-bold text-white">99.9%</div>
                    <div className="text-sm text-gray-400">Uptime</div>
                  </div>
                </div>
                <p className="text-gray-300 text-sm">Affidabilità enterprise con infrastruttura cloud ridondante</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm p-8 rounded-2xl border border-blue-500/30 hover:border-blue-500/50 transition group">
                <div className="flex items-center justify-between mb-4">
                  <BarChart3 className="w-12 h-12 text-blue-400 group-hover:scale-110 transition" />
                  <div className="text-right">
                    <div className="text-4xl font-bold text-white">40%</div>
                    <div className="text-sm text-gray-400">Più Produttivi</div>
                  </div>
                </div>
                <p className="text-gray-300 text-sm">Incremento medio della produttività riportato dai nostri clienti</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Tutto quello che serve per essere produttivi
              </h2>
              <p className="text-xl text-gray-400">
                Features progettate per team moderni e ambiziosi
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm p-6 rounded-2xl border border-purple-500/20 hover:border-purple-500/50 transition group hover:shadow-xl hover:shadow-purple-500/20"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition text-white">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Prezzi semplici e trasparenti
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                Scegli il piano perfetto per il tuo team
              </p>

              {/* Toggle Monthly/Yearly */}
              <div className="inline-flex bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 border border-purple-500/20">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`px-6 py-2 rounded-lg transition ${
                    selectedPlan === 'monthly' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : 'text-gray-400'
                  }`}
                >
                  Mensile
                </button>
                <button
                  onClick={() => setSelectedPlan('yearly')}
                  className={`px-6 py-2 rounded-lg transition relative ${
                    selectedPlan === 'yearly' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : 'text-gray-400'
                  }`}
                >
                  Annuale
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    -17%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan, index) => (
                <div 
                  key={index}
                  className={`relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm p-8 rounded-2xl border ${
                    plan.popular 
                      ? 'border-purple-500 shadow-2xl shadow-purple-500/20 scale-105' 
                      : 'border-purple-500/20'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        Più Popolare
                      </span>
                    </div>
                  )}

                  <h3 className="text-2xl font-bold text-white mb-2 text-center">{plan.name}</h3>
                  <p className="text-gray-400 mb-6 text-center">{plan.description}</p>

                  <div className="mb-6 text-center">
                    {plan.price ? (
                      <>
                        <span className="text-5xl font-bold text-white">
                          €{plan.price[selectedPlan as keyof typeof plan.price]}
                        </span>
                        <span className="text-gray-400">/{selectedPlan === 'monthly' ? 'mese' : 'anno'}</span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        Contattaci
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleNavigateToRegisterCompany}
                    className={`w-full py-3 rounded-lg font-semibold transition mb-6 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    {plan.price ? 'Inizia Ora' : 'Contattaci Ora'}
                  </button>

                  <ul className="space-y-3">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-2 text-gray-300">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Adorato da team di tutto il mondo
              </h2>
              <p className="text-xl text-gray-400">
                Scopri cosa dicono i nostri clienti
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index}
                  className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm p-6 rounded-2xl border border-purple-500/20"
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="text-white font-semibold">{testimonial.name}</p>
                    <p className="text-gray-400 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm p-12 rounded-3xl border border-purple-500/30">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Pronto a trasformare il tuo workflow?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Unisciti a migliaia di team che già usano Planora ogni giorno
              </p>
              <button 
                onClick={handleNavigateToRegisterCompany}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition"
              >
                Inizia Gratis Oggi
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-950/90 backdrop-blur-sm border-t border-purple-500/20 py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">Planora</span>
                </div>
                <p className="text-gray-400 text-sm">
                  La piattaforma di task management potenziata dall'AI
                </p>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-4">Prodotto</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#" className="hover:text-white transition">Features</a></li>
                  <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition">Roadmap</a></li>
                  <li><a href="#" className="hover:text-white transition">Changelog</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-4">Azienda</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#" className="hover:text-white transition">Chi siamo</a></li>
                  <li><a href="#" className="hover:text-white transition">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition">Carriere</a></li>
                  <li><a href="#" className="hover:text-white transition">Contatti</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-4">Legale</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                  <li><a href="#" className="hover:text-white transition">Termini</a></li>
                  <li><a href="#" className="hover:text-white transition">Cookie</a></li>
                  <li><a href="#" className="hover:text-white transition">Licenze</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-purple-500/20 pt-8 text-center text-gray-400 text-sm">
              <p>© 2025 Planora. Tutti i diritti riservati.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}