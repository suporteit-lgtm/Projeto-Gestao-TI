// Tela de preload — "System Initialize" — Glitch + Barra de progresso + Partículas
import { useEffect, useState, useRef } from "react";

interface PreloadProps {
  onFinish: () => void;
}

// Partículas fixas (posição aleatória pré-definida para SSR-safe)
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id  : i,
  x   : (i * 37 + 11) % 100,
  y   : (i * 53 + 7)  % 100,
  size: (i % 3) + 1.5,
  dur : 3 + (i % 4),
  del : (i * 0.15) % 2,
  color: i % 3 === 0 ? "rgba(255,120,20,0.55)" : i % 3 === 1 ? "rgba(30,100,255,0.55)" : "rgba(255,255,255,0.2)",
}));

export default function Preload({ onFinish }: PreloadProps) {
  const [phase, setPhase]           = useState<"reveal"|"exit">("reveal");
  const [progress, setProgress]     = useState(0);
  const [glitch, setGlitch]         = useState(false);
  const rafRef                      = useRef<number>(0);

  /* ── FASE 2: Revela conteúdo + glitch ── */
  useEffect(() => {
    if (phase !== "reveal") return;

    // Glitch na logo
    const g1 = setTimeout(() => setGlitch(true),  100);
    const g2 = setTimeout(() => setGlitch(false), 250);
    const g3 = setTimeout(() => setGlitch(true),  380);
    const g4 = setTimeout(() => setGlitch(false), 430);

    // Progresso
    const startP = performance.now();
    const durP   = 3000;
    function tickP(now: number) {
      const t     = Math.min((now - startP) / durP, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      if (t < 1) rafRef.current = requestAnimationFrame(tickP);
    }
    rafRef.current = requestAnimationFrame(tickP);

    // Exit
    const ex1 = setTimeout(() => setPhase("exit"),  3500);
    const ex2 = setTimeout(() => onFinish(),         4000);

    return () => {
      [g1, g2, g3, g4, ex1, ex2].forEach(clearTimeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [phase, onFinish]);

  const segments = 12;

  return (
    <div style={{
      position      : "fixed",
      inset         : 0,
      zIndex        : 9999,
      overflow      : "hidden",
      background    : "#080808",
      transition    : "opacity 0.5s ease, transform 0.5s ease",
      opacity       : phase === "exit" ? 0 : 1,
      transform     : phase === "exit" ? "scale(1.04)" : "scale(1)",
      pointerEvents : phase === "exit" ? "none" : "all",
    }}>

      {/* ══ PARTÍCULAS ══ */}
      {phase === "reveal" && PARTICLES.map(p => (
        <div key={p.id} aria-hidden="true" style={{
          position     : "absolute",
          left         : `${p.x}%`,
          top          : `${p.y}%`,
          width        : p.size,
          height       : p.size,
          borderRadius : "50%",
          background   : p.color,
          animation    : `particlePop ${p.dur}s ease-in-out ${p.del}s infinite alternate`,
          pointerEvents: "none",
        }} />
      ))}







      {/* ══ CONTEÚDO CENTRAL ══ */}
      <div style={{
        position      : "absolute",
        inset         : 0,
        display       : "flex",
        flexDirection : "column",
        alignItems    : "center",
        justifyContent: "center",
        gap           : 28,
      }}>

        {/* ── LOGO COM GLITCH ── */}
        <div style={{ position:"relative", width:130, height:130 }}>
          {/* Sombras de glitch */}
          {glitch && <>
            <img src="/logo.png" alt="" aria-hidden="true" style={{
              position:"absolute", width:110, top:"50%", left:"50%",
              transform:"translate(calc(-50% + 3px), calc(-50% - 2px))",
              filter:"drop-shadow(0 0 8px #1E64FF)",
              opacity:0.6, mixBlendMode:"screen",
            }}/>
            <img src="/logo.png" alt="" aria-hidden="true" style={{
              position:"absolute", width:110, top:"50%", left:"50%",
              transform:"translate(calc(-50% - 3px), calc(-50% + 2px))",
              filter:"drop-shadow(0 0 8px #FF7814)",
              opacity:0.6, mixBlendMode:"screen",
            }}/>
          </>}
          {/* Logo principal */}
          <img
            src="/logo.png"
            alt="Inventário TI"
            style={{
              position : "absolute",
              width    : 110,
              top      : "50%",
              left     : "50%",
              transform: glitch
                ? "translate(-50%, -50%) skewX(-4deg) scaleX(1.03)"
                : "translate(-50%, -50%) skewX(0deg) scaleX(1)",
              filter   : "drop-shadow(0 4px 18px rgba(0,0,0,0.8))",
              transition: "transform 0.05s",
            }}
          />
          {/* Anel giratório */}
          <div style={{
            position     : "absolute",
            inset        : 0,
            borderRadius : "50%",
            border       : "1.5px solid transparent",
            borderTopColor  : "#1E64FF",
            borderRightColor: "#FF7814",
            animation    : "spinRing 1.8s linear infinite",
          }}/>
          <div style={{
            position     : "absolute",
            inset        : 8,
            borderRadius : "50%",
            border       : "1px solid transparent",
            borderBottomColor: "rgba(255,120,20,0.4)",
            borderLeftColor  : "rgba(30,100,255,0.4)",
            animation    : "spinRing 2.8s linear infinite reverse",
          }}/>
        </div>

        {/* ── TÍTULO ── */}
        <div style={{ textAlign:"center", lineHeight:1 }}>
          <h1 style={{
            margin:0, fontSize:"1.45rem", fontWeight:700,
            letterSpacing:"0.08em", color:"#f1f5f9",
            fontFamily:"'Segoe UI','Inter',sans-serif",
            filter: glitch ? "blur(1px)" : "none",
            transition: "filter 0.05s",
          }}>
            INVENTÁRIO{" "}
            <span style={{
              background: "linear-gradient(90deg,#1E64FF,#FF7814)",
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              backgroundClip:"text",
            }}>TI</span>
          </h1>
          <p style={{
            margin:"6px 0 0", fontSize:"0.62rem",
            letterSpacing:"0.28em", textTransform:"uppercase",
            color:"rgba(148,163,184,0.35)",
            fontFamily:"'Segoe UI','Inter',sans-serif",
          }}>
            Gestão de Equipamentos
          </p>
        </div>



        {/* ── ESTRADA E MOTO DE PROGRESSO ── */}
        <div style={{ width: 340, position: "relative", height: 65 }}>
          {/* A Moto */}
          <div style={{
            position: "absolute",
            bottom: 8,
            left: `calc(${progress * 0.82}% - 4px)`, // Mantém a moto perfeitamente na pista de 340px
            width: 60,
            height: 40,
            transition: "left 0.1s ease-out",
          }}>
            <svg width="60" height="40" viewBox="0 0 60 40" style={{ display: "block" }}>
              <g className="bike-body" style={{ transformOrigin: "center", animation: "bikeRide 0.12s ease-in-out infinite" }}>
                {/* Lanterna traseira glow */}
                <path d="M8 20 L2 21 L5 23 Z" fill="#FF7814" opacity="0.8" />
                
                {/* Escapamento */}
                <path d="M12 30 L6 31 L8 32 L14 31 Z" fill="#555" />
                
                {/* Balança traseira */}
                <path d="M15 28 L27 26 L25 23 Z" fill="#2d3748" />
                
                {/* Motor e chassi principal */}
                <path d="M23 28 L30 18 L38 18 L43 28 Z" fill="#1a202c" stroke="#2d3748" strokeWidth="1.5" />
                <circle cx="31" cy="24" r="4" fill="#FF7814" opacity="0.8" />
                <circle cx="35" cy="25" r="3" fill="#1E64FF" opacity="0.8" />
                
                {/* Carenagem */}
                <path d="M18 20 L28 13 L42 13 L46 22 L36 24 Z" fill="#1E64FF" />
                <path d="M28 13 L35 13 L39 17 L31 17 Z" fill="#FF7814" />
                
                {/* Assento */}
                <path d="M18 20 L24 20 L26 18 L20 18 Z" fill="#0d1117" />
                
                {/* Guidão e garfo */}
                <path d="M38 13 L42 7 L44 7" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round" />
                {/* Para-brisa */}
                <path d="M40 13 L43 7 L37 7 Z" fill="rgba(30,100,255,0.4)" />
                
                {/* Garfo dianteiro da roda */}
                <path d="M42 13 L45 28" stroke="#4a5568" strokeWidth="2" />
              </g>
              
              {/* Roda Traseira (girando) */}
              <g className="wheel" style={{ transformOrigin: "15px 28px", animation: "wheelSpin 0.3s linear infinite" }}>
                <circle cx="15" cy="28" r="8" fill="#0d1117" stroke="#2d3748" strokeWidth="2.5" />
                <line x1="15" y1="20" x2="15" y2="36" stroke="#FF7814" strokeWidth="1.5" />
                <line x1="7" y1="28" x2="23" y2="28" stroke="#FF7814" strokeWidth="1.5" />
                <circle cx="15" cy="28" r="3" fill="#a0aec0" />
              </g>
              
              {/* Roda Dianteira (girando) */}
              <g className="wheel" style={{ transformOrigin: "45px 28px", animation: "wheelSpin 0.3s linear infinite" }}>
                <circle cx="45" cy="28" r="8" fill="#0d1117" stroke="#2d3748" strokeWidth="2.5" />
                <line x1="45" y1="20" x2="45" y2="36" stroke="#1E64FF" strokeWidth="1.5" />
                <line x1="37" y1="28" x2="53" y2="28" stroke="#1E64FF" strokeWidth="1.5" />
                <circle cx="45" cy="28" r="3" fill="#a0aec0" />
              </g>
            </svg>
          </div>

          {/* A Pista (Estrada) */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 10,
            background: "linear-gradient(90deg, #1e3a8a 0%, #1E64FF 100%)",
            boxShadow: "0 0 10px rgba(30,100,255,0.4)",
            borderRadius: 5,
            overflow: "hidden",
          }}>
            {/* Faixa tracejada central da estrada, simulando movimento */}
            <div style={{
              height: "2px",
              width: "200%",
              position: "absolute",
              top: "4px",
              left: 0,
              backgroundImage: "linear-gradient(90deg, #ffffff 60%, transparent 40%)",
              backgroundSize: "16px 2px",
              animation: "roadScroll 0.4s linear infinite",
            }} />
          </div>
        </div>

        {/* Textos Informativos */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          width: 340,
          fontSize: "0.6rem",
          fontFamily: "monospace",
          color: "rgba(148,163,184,0.35)",
          marginTop: -10,
        }}>
          <span>INICIALIZANDO</span>
          <span style={{ color: progress === 100 ? "#FF7814" : "rgba(148,163,184,0.35)" }}>
            {progress}%
          </span>
        </div>

      </div>

      {/* ══ CORNER DECORATIONS ══ */}
      {["top-0 left-0","top-0 right-0","bottom-0 left-0","bottom-0 right-0"].map((pos,i) => (
        <div key={i} aria-hidden="true" style={{
          position:"absolute",
          ...(pos.includes("top-0")    ? { top:16 }    : { bottom:16 }),
          ...(pos.includes("left-0")   ? { left:16 }   : { right:16  }),
          width:24, height:24,
          borderTop   : pos.includes("top-0")    ? "1.5px solid rgba(30,100,255,0.4)"  : "none",
          borderBottom: pos.includes("bottom-0") ? "1.5px solid rgba(255,120,20,0.4)" : "none",
          borderLeft  : pos.includes("left-0")   ? "1.5px solid rgba(30,100,255,0.4)"  : "none",
          borderRight : pos.includes("right-0")  ? "1.5px solid rgba(255,120,20,0.4)" : "none",
        }}/>
      ))}

      {/* ══ KEYFRAMES ══ */}
      <style>{`
        @keyframes spinRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes particlePop {
          from { transform: scale(0.7) translateY(0px); opacity:0.3; }
          to   { transform: scale(1.3) translateY(-8px); opacity:1; }
        }
        @keyframes blink {
          0%,100% { opacity:1; }
          50%     { opacity:0; }
        }
        @keyframes wheelSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bikeRide {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-1.5px); }
        }
        @keyframes roadScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-16px); }
        }
      `}</style>
    </div>
  );
}
