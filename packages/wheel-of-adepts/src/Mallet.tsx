import { useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";

export interface MalletProps {
  onClick: () => void;
  disabled: boolean;
  onGrab?: () => void;
  onSwing?: () => void;
  hideHints?: boolean;
}

const PULL_THRESHOLD = 90;

/**
 * Distance from the top of the Mallet column to the visual center of the hammer head (px).
 * Matches layout: hint arrows + title + SVG head geometry (viewBox 0–230, head ~y 14–80).
 * Used to align the head with the wheel pointer (FortuneWheel `pointerY` = 50% of wheel height).
 */
export const MALLET_HEAD_CENTER_OFFSET_PX = 122;

const SHIMMER_STYLE = `
@keyframes mallet-shimmer {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.mallet-title {
  background: linear-gradient(90deg, #f1c40f, #c39bd3, #5dade2, #2ecc71, #f39c12, #9b59b6, #f1c40f);
  background-size: 300% 300%;
  animation: mallet-shimmer 3s ease infinite;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-family: monospace;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 4px;
  text-align: center;
  white-space: nowrap;
  margin-bottom: 2px;
}
`;

/* Lightning bolt path: 10×22px, classic Z-shape */
const BOLT = "M 4,0 L 10,0 L 6,11 L 10,11 L 6,22 L 0,22 L 4,11 L 0,11 Z";

export function Mallet({ onClick, disabled, onGrab, onSwing, hideHints }: MalletProps) {
  const [swinging, setSwinging] = useState(false);
  const [ready, setReady] = useState(false);
  const y = useMotionValue(0);

  const handleDragStart = () => {
    if (disabled || swinging) return;
    onGrab?.();
  };

  const handleDrag = () => {
    setReady(y.get() >= PULL_THRESHOLD);
  };

  const handleDragEnd = () => {
    if (disabled || swinging) return;
    if (y.get() >= PULL_THRESHOLD) {
      setSwinging(true);
      onSwing?.();
      onClick();
      animate(y, 0, { type: "spring", stiffness: 380, damping: 22 });
      setTimeout(() => {
        setSwinging(false);
        setReady(false);
      }, 700);
    } else {
      animate(y, 0, { type: "spring", stiffness: 500, damping: 28 });
      setReady(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", userSelect: "none" }}>
      <style>{SHIMMER_STYLE}</style>

      {/* Pull-down hint arrows */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 5,
          marginBottom: 8,
          visibility: hideHints ? "hidden" : "visible",
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={
              disabled ? { opacity: 0.08 } : ready ? { opacity: 1 } : { opacity: [0.1, 0.75, 0.1] }
            }
            transition={
              ready ? undefined : { duration: 1.1, delay: i * 0.22, repeat: Infinity, ease: "easeInOut" }
            }
            style={{
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: `12px solid ${ready ? "#f1c40f" : "rgba(255,255,255,0.55)"}`,
              transition: "border-top-color 0.15s",
              filter: ready ? "drop-shadow(0 0 6px #f1c40f)" : "none",
            }}
          />
        ))}
      </div>

      {/* Shimmering title — closer to mallet */}
      <div className="mallet-title">ᛗᛟᛚᛟᛏ ᚲᚨᛞᚷᚨᚱᚨ</div>

      {/* Draggable wrapper — handles Y drag */}
      <motion.div
        drag={disabled || swinging ? false : "y"}
        dragConstraints={{ top: 0, bottom: PULL_THRESHOLD + 25 }}
        dragElastic={{ top: 0, bottom: 0.2 }}
        style={{ y, touchAction: "none", cursor: disabled ? "not-allowed" : "grab" }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        whileHover={disabled ? {} : { scale: 1.05 }}
      >
        {/* Inner wrapper — handles swing rotation */}
        <motion.div
          animate={swinging ? { rotate: [-30, 18, -8, 4, 0] } : { rotate: 0 }}
          transition={swinging ? { duration: 0.55, ease: "easeOut" } : { duration: 0.2 }}
          style={{ transformOrigin: "60px 20px" }}
        >
          <svg width="130" height="230" viewBox="0 0 130 230">
            <defs>
              <linearGradient id="handle-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7B3F00" />
                <stop offset="40%" stopColor="#D2691E" />
                <stop offset="70%" stopColor="#CD853F" />
                <stop offset="100%" stopColor="#7B3F00" />
              </linearGradient>
              <linearGradient id="head-top" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d0d0d0" />
                <stop offset="25%" stopColor="#f0f0f0" />
                <stop offset="60%" stopColor="#c8c8c8" />
                <stop offset="100%" stopColor="#909090" />
              </linearGradient>
              <linearGradient id="head-front" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#888" />
                <stop offset="30%" stopColor="#bbb" />
                <stop offset="100%" stopColor="#777" />
              </linearGradient>
              <filter id="mallet-shadow">
                <feDropShadow dx="4" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.55" />
              </filter>
              <filter id="mallet-glow">
                <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#f1c40f" floodOpacity="0.9" />
              </filter>
              <filter id="bolt-glow">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Handle */}
            <rect
              x="54"
              y="78"
              width="20"
              height="150"
              rx="5"
              fill="url(#handle-grad)"
              filter={ready ? "url(#mallet-glow)" : "url(#mallet-shadow)"}
            />
            <rect x="58" y="78" width="5" height="150" fill="rgba(255,255,255,0.18)" rx="2" />

            {/* Wrap marks on handle */}
            {[95, 112, 129, 146, 163, 180].map((yv) => (
              <rect key={yv} x="53" y={yv} width="22" height="2.5" rx="1" fill="rgba(255,255,255,0.18)" />
            ))}

            {/* Mallet head */}
            <rect
              x="8"
              y="14"
              width="108"
              height="66"
              rx="7"
              fill="url(#head-top)"
              filter={ready ? "url(#mallet-glow)" : "url(#mallet-shadow)"}
            />
            <path d="M10 80 L10 88 Q10 90 14 90 L112 90 Q118 90 118 84 L118 80 Z" fill="#707070" />
            <path d="M116 16 L124 22 L124 86 L118 80 L118 16 Z" fill="#888" opacity="0.6" />
            <rect x="12" y="20" width="100" height="8" rx="3" fill="rgba(255,255,255,0.4)" />

            {/* Animated lightning bolts on head */}
            {[
              { x: 20, delay: 0, dur: 1.9 },
              { x: 55, delay: 0.38, dur: 2.3 },
              { x: 90, delay: 0.71, dur: 1.6 },
            ].map(({ x, delay, dur }) => (
              <motion.path
                key={x}
                d={BOLT}
                transform={`translate(${x}, 23)`}
                filter="url(#bolt-glow)"
                animate={{
                  fill: ["#ffe066", "#ffffff", "#7ecfff", "#dd99ff", "#ffe530", "#ffffff", "#ffe066"],
                  opacity: [0.65, 1, 0.2, 1, 0.5, 0.9, 0.65],
                }}
                transition={{
                  duration: dur,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay,
                }}
              />
            ))}

            {/* Purple accent band */}
            <rect x="8" y="55" width="108" height="12" rx="2" fill={ready ? "#f1c40f" : "#8e44ad"} />
            <rect x="8" y="57" width="108" height="4" fill="rgba(255,255,255,0.2)" />

            {/* Handle bottom cap */}
            <rect x="52" y="220" width="24" height="8" rx="4" fill="#5D2E0C" />
          </svg>
        </motion.div>
      </motion.div>

      <div
        style={{
          textAlign: "center",
          fontFamily: "monospace",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "3px",
          marginTop: 6,
          color: ready ? "#f1c40f" : "rgba(255,255,255,0.45)",
          textShadow: ready ? "0 0 10px #f1c40f" : "none",
          opacity: disabled || hideHints ? 0 : 1,
          transition: "opacity 0.3s, color 0.2s",
        }}
      >
        {ready ? "Отпустить!" : "Потяни вниз"}
      </div>
    </div>
  );
}
