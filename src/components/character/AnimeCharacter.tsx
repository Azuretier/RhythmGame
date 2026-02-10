'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './AnimeCharacter.module.css';

interface AnimeCharacterProps {
  size?: number;
  className?: string;
}

export default function AnimeCharacter({ size = 420, className }: AnimeCharacterProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [expression, setExpression] = useState<'idle' | 'happy'>('idle');

  const handleClick = () => {
    setExpression('happy');
    setTimeout(() => setExpression('idle'), 2000);
  };

  // Stable sparkle positions
  const sparklePositions = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      left: `${15 + ((i * 37 + 13) % 70)}%`,
      top: `${10 + ((i * 53 + 7) % 80)}%`,
      delay: `${i * 0.8}s`,
      duration: `${2.5 + (i * 0.4)}s`,
    })), []);

  return (
    <motion.div
      className={`${styles.characterWrapper} ${className || ''}`}
      style={{ width: size, height: size * 1.25 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Ambient glow behind character */}
      <div className={styles.ambientGlow} />

      {/* Floating sparkle particles */}
      <div className={styles.sparkles}>
        {sparklePositions.map((pos, i) => (
          <div
            key={i}
            className={styles.sparkle}
            style={{
              left: pos.left,
              top: pos.top,
              animationDelay: pos.delay,
              animationDuration: pos.duration,
            }}
          />
        ))}
      </div>

      {/* Main character SVG */}
      <motion.div
        className={styles.characterContainer}
        animate={{
          y: isHovered ? -8 : [0, -6, 0],
        }}
        transition={
          isHovered
            ? { duration: 0.3 }
            : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <svg
          viewBox="0 0 400 480"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.characterSvg}
        >
          <defs>
            {/* Hair gradient - white/silver */}
            <linearGradient id="hairGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F5F0F0" />
              <stop offset="50%" stopColor="#E8E0E0" />
              <stop offset="100%" stopColor="#D8CCD0" />
            </linearGradient>
            <linearGradient id="hairHighlight" x1="0.3" y1="0" x2="0.7" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F0E8E8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hairShadow" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#E0D4D8" />
              <stop offset="100%" stopColor="#C8B8C0" />
            </linearGradient>

            {/* Eye gradient - pink/magenta */}
            <radialGradient id="eyeGrad" cx="0.5" cy="0.4" r="0.5">
              <stop offset="0%" stopColor="#FF6EB4" />
              <stop offset="45%" stopColor="#E8308C" />
              <stop offset="100%" stopColor="#8B1050" />
            </radialGradient>

            {/* Outfit gradients - red/black gothic */}
            <linearGradient id="outfitRed" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#CC2233" />
              <stop offset="50%" stopColor="#AA1828" />
              <stop offset="100%" stopColor="#881420" />
            </linearGradient>
            <linearGradient id="outfitDark" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#2A2030" />
              <stop offset="100%" stopColor="#1A1018" />
            </linearGradient>
            <linearGradient id="gloveRed" x1="0" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#DD3344" />
              <stop offset="100%" stopColor="#AA2030" />
            </linearGradient>

            {/* Skin gradient */}
            <linearGradient id="skinGrad" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#FFE8D6" />
              <stop offset="100%" stopColor="#FFDBC4" />
            </linearGradient>

            {/* Hat gradient */}
            <linearGradient id="hatGrad" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#3A3040" />
              <stop offset="100%" stopColor="#1E1620" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="pinkGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ============================================ */}
          {/* HAIR - Back layer (twin tails + flowing) */}
          {/* ============================================ */}
          <g className={styles.hairBack}>
            {/* Left twin tail */}
            <path
              d="M120 95 C105 110, 70 150, 55 220 C45 270, 50 340, 60 390 C63 405, 55 430, 62 445 C70 460, 82 455, 85 440 C90 410, 80 350, 85 290 C88 250, 100 180, 120 140 Z"
              fill="url(#hairGrad)"
              stroke="#D0C0C8" strokeWidth="0.5"
            />
            {/* Left twin tail inner highlight */}
            <path
              d="M110 110 C95 140, 72 200, 65 270 C62 310, 68 370, 72 410"
              fill="none" stroke="url(#hairHighlight)" strokeWidth="3" opacity="0.3"
            />
            {/* Left twin tail wispy ends */}
            <path
              d="M62 445 C55 455, 48 460, 45 455 C42 448, 50 440, 58 442"
              fill="url(#hairGrad)"
            />

            {/* Right twin tail */}
            <path
              d="M280 95 C295 110, 330 150, 345 220 C355 270, 350 340, 340 390 C337 405, 345 430, 338 445 C330 460, 318 455, 315 440 C310 410, 320 350, 315 290 C312 250, 300 180, 280 140 Z"
              fill="url(#hairGrad)"
              stroke="#D0C0C8" strokeWidth="0.5"
            />
            {/* Right twin tail inner highlight */}
            <path
              d="M290 110 C305 140, 328 200, 335 270 C338 310, 332 370, 328 410"
              fill="none" stroke="url(#hairHighlight)" strokeWidth="3" opacity="0.3"
            />
            {/* Right twin tail wispy ends */}
            <path
              d="M338 445 C345 455, 352 460, 355 455 C358 448, 350 440, 342 442"
              fill="url(#hairGrad)"
            />

            {/* Back center hair mass */}
            <path
              d="M140 90 C135 120, 130 180, 135 230 C138 260, 140 280, 138 300
               L262 300 C260 280, 262 260, 265 230 C270 180, 265 120, 260 90 Z"
              fill="url(#hairShadow)" opacity="0.5"
            />
          </g>

          {/* ============================================ */}
          {/* BODY / OUTFIT - Red & black gothic lolita */}
          {/* ============================================ */}
          <g>
            {/* Neck */}
            <path
              d="M186 210 L186 235 C186 241, 214 241, 214 235 L214 210"
              fill="url(#skinGrad)"
            />

            {/* === TORSO - Red dress top === */}
            <path
              d="M148 245 C158 236, 176 233, 186 235 L214 235 C224 233, 242 236, 252 245
               L260 265 C262 275, 260 290, 256 305
               L254 340 L146 340
               L144 305 C140 290, 138 275, 140 265 Z"
              fill="url(#outfitRed)"
              stroke="#6A0015" strokeWidth="0.8"
            />

            {/* White lace collar */}
            <path
              d="M160 240 C165 235, 175 232, 186 235 L200 242 L214 235 C225 232, 235 235, 240 240
               L235 248 C228 252, 215 250, 200 255 C185 250, 172 252, 165 248 Z"
              fill="#FFFFFF" stroke="#E0D0D0" strokeWidth="0.5"
            />
            {/* Lace scallop details */}
            <path
              d="M162 247 C165 250, 170 250, 173 247 C176 250, 181 250, 184 247 C187 250, 192 250, 195 247 C198 250, 203 250, 206 247 C209 250, 214 250, 217 247 C220 250, 225 250, 228 247 C231 250, 236 250, 239 247"
              fill="none" stroke="#E0D0D0" strokeWidth="0.8" opacity="0.7"
            />

            {/* Center line of dress */}
            <path d="M200 255 L200 340" stroke="#6A0015" strokeWidth="0.8" opacity="0.5" />

            {/* Cross-lacing on chest */}
            <path d="M192 260 L208 275" stroke="#1A1018" strokeWidth="1" opacity="0.6" />
            <path d="M208 260 L192 275" stroke="#1A1018" strokeWidth="1" opacity="0.6" />
            <path d="M192 275 L208 290" stroke="#1A1018" strokeWidth="1" opacity="0.6" />
            <path d="M208 275 L192 290" stroke="#1A1018" strokeWidth="1" opacity="0.6" />

            {/* Black trim bands on dress */}
            <path d="M148 290 L252 290" stroke="#1A1018" strokeWidth="3" opacity="0.8" />
            <path d="M146 340 L254 340" stroke="#1A1018" strokeWidth="3" opacity="0.8" />

            {/* Bunny charm on center */}
            <g transform="translate(200, 310)">
              {/* Bunny body */}
              <ellipse cx="0" cy="4" rx="6" ry="8" fill="#FFFFFF" stroke="#D0C0C0" strokeWidth="0.5" />
              {/* Bunny ears */}
              <path d="M-3 -4 L-4 -14 L0 -6" fill="#FFFFFF" stroke="#D0C0C0" strokeWidth="0.5" />
              <path d="M3 -4 L4 -14 L0 -6" fill="#FFFFFF" stroke="#D0C0C0" strokeWidth="0.5" />
              {/* Bunny inner ears */}
              <path d="M-2.5 -5 L-3 -12 L-0.5 -6" fill="#FFB0B0" opacity="0.5" />
              <path d="M2.5 -5 L3 -12 L0.5 -6" fill="#FFB0B0" opacity="0.5" />
              {/* Bunny eyes */}
              <circle cx="-2" cy="2" r="1" fill="#2A2030" />
              <circle cx="2" cy="2" r="1" fill="#2A2030" />
              {/* Bunny bow */}
              <path d="M-4 -1 C-8 -4, -8 2, -4 0" fill="#60D0D0" stroke="#40B0B0" strokeWidth="0.3" />
              <path d="M4 -1 C8 -4, 8 2, 4 0" fill="#60D0D0" stroke="#40B0B0" strokeWidth="0.3" />
              <circle cx="0" cy="0" r="1.2" fill="#60D0D0" />
            </g>
          </g>

          {/* === SKIRT - Black with red accents === */}
          <g>
            <path
              d="M142 338 C138 355, 118 400, 108 435 C105 445, 110 450, 118 448
               L152 440 C158 438, 165 430, 170 418 L185 380 L200 440 L215 380
               L230 418 C235 430, 242 438, 248 440 L282 448 C290 450, 295 445, 292 435
               C282 400, 262 355, 258 338 Z"
              fill="url(#outfitDark)"
              stroke="#3A2030" strokeWidth="0.5"
            />
            {/* Red trim at skirt edge */}
            <path
              d="M108 435 C130 442, 165 448, 200 445 C235 448, 270 442, 292 435"
              fill="none" stroke="#CC2233" strokeWidth="2.5" strokeLinecap="round"
            />
            {/* White lace at skirt bottom */}
            <path
              d="M110 440 C114 444, 118 444, 122 440 C126 444, 130 444, 134 440 C138 444, 142 444, 146 440
               C150 444, 154 444, 158 440 C162 444, 166 444, 170 440 C174 444, 178 444, 182 440
               C186 444, 190 444, 194 440 C198 444, 202 444, 206 440 C210 444, 214 444, 218 440
               C222 444, 226 444, 230 440 C234 444, 238 444, 242 440 C246 444, 250 444, 254 440
               C258 444, 262 444, 266 440 C270 444, 274 444, 278 440 C282 444, 286 444, 290 440"
              fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.5"
            />
            {/* Pleat lines */}
            <path d="M170 345 L155 440" stroke="rgba(200,40,60,0.2)" strokeWidth="0.8" />
            <path d="M200 345 L200 445" stroke="rgba(200,40,60,0.2)" strokeWidth="0.8" />
            <path d="M230 345 L245 440" stroke="rgba(200,40,60,0.2)" strokeWidth="0.8" />
          </g>

          {/* === ARMS & OVERSIZED RED GLOVES === */}
          <g>
            {/* Left arm (reaching forward / pointing) */}
            <path
              d="M142 250 C128 260, 110 278, 98 295 C86 312, 78 325, 75 335
               C73 340, 76 344, 80 342 L90 332 C96 322, 108 300, 120 280 Z"
              fill="url(#outfitRed)" stroke="#6A0015" strokeWidth="0.5"
            />
            {/* Left glove - oversized */}
            <path
              d="M75 332 C68 338, 58 345, 52 348 C45 350, 40 356, 44 362
               C48 368, 56 368, 64 364 L72 358 C74 362, 72 370, 78 374
               C84 378, 90 374, 88 366 L86 354 C90 350, 92 344, 88 340
               L82 338 Z"
              fill="url(#gloveRed)" stroke="#8A1525" strokeWidth="1"
            />
            {/* Glove cuff */}
            <path
              d="M78 332 C80 328, 86 326, 92 330 L96 336 C90 340, 82 340, 78 336 Z"
              fill="#DDC060" stroke="#BB9030" strokeWidth="0.5"
            />
            {/* Glove knuckle details */}
            <circle cx="62" cy="358" r="2" fill="#8A1525" opacity="0.4" />
            <circle cx="72" cy="362" r="2" fill="#8A1525" opacity="0.4" />

            {/* Right arm (down / relaxed) */}
            <path
              d="M258 250 C268 262, 278 285, 282 305 C286 325, 284 345, 280 358
               C278 364, 272 366, 270 360 L266 340 C264 320, 262 300, 260 280 Z"
              fill="url(#outfitRed)" stroke="#6A0015" strokeWidth="0.5"
            />
            {/* Right glove */}
            <path
              d="M280 356 C284 364, 288 372, 286 378 C284 384, 278 386, 274 382
               C270 378, 268 370, 270 362 Z"
              fill="url(#gloveRed)" stroke="#8A1525" strokeWidth="1"
            />
            {/* Right glove cuff */}
            <path
              d="M268 352 C272 348, 280 348, 284 352 L286 358 C280 362, 272 362, 268 358 Z"
              fill="#DDC060" stroke="#BB9030" strokeWidth="0.5"
            />
          </g>

          {/* === LEGS (short, chibi style) === */}
          <g>
            {/* Left leg - black stocking */}
            <path
              d="M175 438 C172 448, 170 460, 172 470 C173 476, 178 478, 180 473
               L182 462 C183 455, 180 445, 178 438"
              fill="#1A1018" stroke="#2A2030" strokeWidth="0.5"
            />
            {/* Left shoe */}
            <path
              d="M170 468 C166 472, 164 478, 168 480 C174 482, 182 480, 184 476
               C185 473, 182 470, 178 470"
              fill="#2A2030" stroke="#1A1018" strokeWidth="0.5"
            />

            {/* Right leg - black stocking */}
            <path
              d="M225 438 C228 448, 230 460, 228 470 C227 476, 222 478, 220 473
               L218 462 C217 455, 220 445, 222 438"
              fill="#1A1018" stroke="#2A2030" strokeWidth="0.5"
            />
            {/* Right shoe */}
            <path
              d="M230 468 C234 472, 236 478, 232 480 C226 482, 218 480, 216 476
               C215 473, 218 470, 222 470"
              fill="#2A2030" stroke="#1A1018" strokeWidth="0.5"
            />
          </g>

          {/* ============================================ */}
          {/* HEAD (chibi = oversized) */}
          {/* ============================================ */}
          <g>
            {/* Face shape - round chibi face */}
            <path
              d="M145 125 C145 85, 160 55, 200 50 C240 55, 255 85, 255 125
               L255 170 C255 200, 235 215, 200 218
               C165 215, 145 200, 145 170 Z"
              fill="url(#skinGrad)"
            />

            {/* Blush marks (always slightly visible, stronger when happy) */}
            <ellipse cx="162" cy="180" rx="14" ry="6" fill="#FF8A8A" opacity="0.18" />
            <ellipse cx="238" cy="180" rx="14" ry="6" fill="#FF8A8A" opacity="0.18" />
            <AnimatePresence>
              {expression === 'happy' && (
                <>
                  <motion.ellipse
                    cx="162" cy="180" rx="14" ry="6"
                    fill="#FF8A8A"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.ellipse
                    cx="238" cy="180" rx="14" ry="6"
                    fill="#FF8A8A"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </>
              )}
            </AnimatePresence>

            {/* === LEFT EYE (winking - closed) === */}
            <g>
              {/* Wink line */}
              <path
                d="M152 155 C158 165, 172 165, 178 155"
                fill="none"
                stroke="#3A2030"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Eyelashes on wink */}
              <path
                d="M150 155 C147 150, 146 146, 148 142"
                fill="none" stroke="#3A2030" strokeWidth="1.5" strokeLinecap="round"
              />
              <path
                d="M179 155 C182 150, 183 146, 181 142"
                fill="none" stroke="#3A2030" strokeWidth="1.5" strokeLinecap="round"
              />
              {/* Small heart above wink eye */}
              <path
                d="M160 138 C158 134, 152 134, 152 138 C152 142, 160 148, 160 148
                 C160 148, 168 142, 168 138 C168 134, 162 134, 160 138 Z"
                fill="#FF4488" opacity="0.8" filter="url(#glow)"
                className={styles.heartBeat}
              />
            </g>

            {/* === RIGHT EYE (open - large pink eye) === */}
            <g>
              {/* Eye white */}
              <ellipse cx="228" cy="155" rx="20" ry="22" fill="#FFFFFF" />
              {/* Iris - pink/magenta */}
              <ellipse cx="228" cy="158" rx="14" ry="16" fill="url(#eyeGrad)" />
              {/* Pupil */}
              <ellipse cx="228" cy="159" rx="6" ry="7" fill="#2A0020" />
              {/* Inner pupil ring */}
              <ellipse cx="228" cy="158" rx="9" ry="10" fill="none" stroke="#FF80C0" strokeWidth="0.5" opacity="0.4" />
              {/* Eye shine - large */}
              <ellipse cx="222" cy="150" rx="5" ry="6" fill="#FFFFFF" opacity="0.95" />
              {/* Eye shine - medium */}
              <ellipse cx="235" cy="163" rx="3" ry="3.5" fill="#FFFFFF" opacity="0.7" />
              {/* Eye shine - tiny sparkle */}
              <circle cx="220" cy="158" r="1.5" fill="#FFFFFF" opacity="0.5" />
              {/* Upper eyelid line */}
              <path
                d="M208 142 C214 132, 228 128, 248 142"
                fill="none"
                stroke="#3A2030"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Eyelashes */}
              <path
                d="M208 142 C204 136, 203 130, 206 126"
                fill="none" stroke="#3A2030" strokeWidth="2" strokeLinecap="round"
              />
              <path
                d="M248 142 C252 136, 253 130, 250 126"
                fill="none" stroke="#3A2030" strokeWidth="2" strokeLinecap="round"
              />
              {/* Lower lash line (subtle) */}
              <path
                d="M214 170 C220 174, 236 174, 242 170"
                fill="none" stroke="#3A2030" strokeWidth="0.8" opacity="0.3"
              />
            </g>

            {/* Nose (tiny, subtle) */}
            <path
              d="M199 178 L200 182 L201 179"
              fill="none" stroke="#E8C4B0" strokeWidth="0.8" strokeLinecap="round" opacity="0.5"
            />

            {/* Mouth - open happy expression with tongue */}
            <g>
              {/* Open mouth */}
              <path
                d="M188 194 C194 203, 206 203, 212 194"
                fill="#8B2040"
                stroke="#6A1530"
                strokeWidth="1"
                strokeLinecap="round"
              />
              {/* Tongue */}
              <path
                d="M195 198 C198 204, 202 204, 205 198"
                fill="#FF7090"
                opacity="0.9"
              />
              {/* Upper lip line */}
              <path
                d="M188 194 C194 190, 206 190, 212 194"
                fill="none"
                stroke="#D4928A"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              {/* Fang (small cute fang on left side) */}
              <path
                d="M191 194 L189 199 L193 195"
                fill="#FFFFFF"
                stroke="#E8D0D0"
                strokeWidth="0.3"
              />
            </g>

            {/* Eyebrows */}
            <path
              d="M154 132 C160 127, 172 126, 178 130"
              fill="none" stroke="#C0A8B0" strokeWidth="1.8" strokeLinecap="round" opacity="0.6"
            />
            <path
              d="M215 128 C224 124, 240 125, 246 130"
              fill="none" stroke="#C0A8B0" strokeWidth="1.8" strokeLinecap="round" opacity="0.6"
            />
          </g>

          {/* ============================================ */}
          {/* HAIR - Front layer (bangs + side hair) */}
          {/* ============================================ */}
          <g className={styles.hairFront}>
            {/* Main bangs mass */}
            <path
              d="M140 60 C148 38, 170 20, 200 16 C230 20, 252 38, 260 60
               L265 85 C265 95, 258 110, 248 120
               L242 138 C238 145, 234 143, 236 136 L240 118
               C244 108, 248 95, 245 80 L230 68
               L215 75 L200 65 L185 75 L170 68
               L155 80 C152 95, 156 108, 160 118
               L164 136 C166 143, 162 145, 158 138
               L152 120 C142 110, 135 95, 135 85 Z"
              fill="url(#hairGrad)"
              stroke="#D0C0C8" strokeWidth="0.5"
            />

            {/* Choppy bang strands */}
            <path
              d="M170 68 C168 85, 166 100, 165 120"
              fill="none" stroke="url(#hairShadow)" strokeWidth="1.5" opacity="0.4"
            />
            <path
              d="M200 65 C200 82, 200 100, 200 115"
              fill="none" stroke="url(#hairShadow)" strokeWidth="1" opacity="0.3"
            />
            <path
              d="M230 68 C232 85, 234 100, 235 120"
              fill="none" stroke="url(#hairShadow)" strokeWidth="1.5" opacity="0.4"
            />

            {/* Left side hair (frames face, longer) */}
            <path
              d="M140 60 C130 55, 118 60, 112 80 C106 100, 100 130, 98 160
               C96 180, 100 195, 108 190 C114 186, 120 165, 125 140
               C130 115, 136 85, 140 70 Z"
              fill="url(#hairGrad)" stroke="#D0C0C8" strokeWidth="0.5"
            />

            {/* Right side hair (frames face, longer) */}
            <path
              d="M260 60 C270 55, 282 60, 288 80 C294 100, 300 130, 302 160
               C304 180, 300 195, 292 190 C286 186, 280 165, 275 140
               C270 115, 264 85, 260 70 Z"
              fill="url(#hairGrad)" stroke="#D0C0C8" strokeWidth="0.5"
            />

            {/* Hair shine highlights */}
            <path
              d="M165 45 C172 40, 185 35, 200 33 C215 35, 228 40, 235 45"
              fill="none" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.5" strokeLinecap="round"
            />
            <path
              d="M172 55 C180 50, 195 47, 200 46 C205 47, 220 50, 228 55"
              fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.3" strokeLinecap="round"
            />

            {/* Ahoge / antenna hair tufts */}
            <path
              d="M195 16 C190 -2, 200 -12, 215 -8 C220 -6, 215 0, 208 6 C204 10, 198 14, 196 16"
              fill="url(#hairGrad)" stroke="#D0C0C8" strokeWidth="0.5"
              className={styles.ahoge}
            />
            <path
              d="M205 16 C210 0, 220 -8, 230 -2 C232 0, 226 4, 218 8 C214 10, 208 14, 206 16"
              fill="url(#hairGrad)" stroke="#D0C0C8" strokeWidth="0.5"
              className={styles.ahoge2}
            />
          </g>

          {/* ============================================ */}
          {/* TOP HAT */}
          {/* ============================================ */}
          <g className={styles.hat} transform="translate(200, 18) rotate(8)">
            {/* Hat brim */}
            <ellipse cx="0" cy="18" rx="32" ry="8" fill="url(#hatGrad)" stroke="#2A2030" strokeWidth="0.5" />
            {/* Hat body */}
            <path
              d="M-20 18 L-18 -12 C-16 -22, -8 -28, 0 -30 C8 -28, 16 -22, 18 -12 L20 18"
              fill="url(#hatGrad)" stroke="#2A2030" strokeWidth="0.5"
            />
            {/* Hat band - red */}
            <rect x="-20" y="8" width="40" height="6" rx="1" fill="#CC2233" />
            {/* Hat band buckle */}
            <circle cx="0" cy="11" r="3.5" fill="#DDC060" stroke="#BB9030" strokeWidth="0.5" />
            <circle cx="0" cy="11" r="1.5" fill="#AA7020" />
            {/* Spade charm hanging from hat */}
            <line x1="12" y1="18" x2="12" y2="30" stroke="#DDC060" strokeWidth="0.5" />
            <path
              d="M12 30 C8 24, 4 28, 8 32 C4 30, 4 34, 8 34 L12 38 L16 34 C20 34, 20 30, 16 32 C20 28, 16 24, 12 30 Z"
              fill="#1A1018" stroke="#3A3040" strokeWidth="0.3"
              transform="scale(0.7) translate(5, 12)"
            />
            {/* Small decorative dots on hat */}
            <circle cx="-8" cy="-10" r="1.5" fill="#DDC060" opacity="0.6" />
            <circle cx="8" cy="-15" r="1" fill="#DDC060" opacity="0.5" />
          </g>

          {/* ============================================ */}
          {/* TWIN TAIL RIBBONS / TIES */}
          {/* ============================================ */}
          <g>
            {/* Left ribbon */}
            <g transform="translate(118, 88)">
              <path d="M0 0 C-8 -6, -16 0, -10 5" fill="#CC2233" stroke="#8A1020" strokeWidth="0.5" />
              <path d="M0 0 C-4 8, -12 10, -8 4" fill="#CC2233" stroke="#8A1020" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="3" fill="#DD3344" stroke="#8A1020" strokeWidth="0.5" />
            </g>
            {/* Right ribbon */}
            <g transform="translate(282, 88)">
              <path d="M0 0 C8 -6, 16 0, 10 5" fill="#CC2233" stroke="#8A1020" strokeWidth="0.5" />
              <path d="M0 0 C4 8, 12 10, 8 4" fill="#CC2233" stroke="#8A1020" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="3" fill="#DD3344" stroke="#8A1020" strokeWidth="0.5" />
            </g>
          </g>

          {/* ============================================ */}
          {/* FLOATING DECORATIONS (pink diamonds / cards) */}
          {/* ============================================ */}
          <g className={styles.decorations} filter="url(#pinkGlow)">
            {/* Pink diamond - top left */}
            <path
              d="M60 80 L68 92 L60 104 L52 92 Z"
              fill="#FF6EB4" opacity="0.5"
              stroke="#FF90C8" strokeWidth="0.5"
              className={styles.floatDiamond1}
            />
            {/* Pink diamond - top right */}
            <path
              d="M340 70 L346 80 L340 90 L334 80 Z"
              fill="#FF6EB4" opacity="0.6"
              stroke="#FF90C8" strokeWidth="0.5"
              className={styles.floatDiamond2}
            />
            {/* Small pink diamond - left */}
            <path
              d="M40 160 L44 168 L40 176 L36 168 Z"
              fill="#FF6EB4" opacity="0.35"
              stroke="#FF90C8" strokeWidth="0.3"
              className={styles.floatDiamond3}
            />
            {/* Small pink diamond - right */}
            <path
              d="M360 160 L364 168 L360 176 L356 168 Z"
              fill="#FF6EB4" opacity="0.35"
              stroke="#FF90C8" strokeWidth="0.3"
              className={styles.floatDiamond1}
            />
            {/* Tiny sparkle dots */}
            <circle cx="50" cy="130" r="2" fill="#FF80C0" opacity="0.4" className={styles.floatDiamond2} />
            <circle cx="350" cy="120" r="1.5" fill="#FF80C0" opacity="0.35" className={styles.floatDiamond3} />
            <circle cx="75" cy="200" r="1.5" fill="#FF80C0" opacity="0.3" className={styles.floatDiamond1} />
          </g>
        </svg>
      </motion.div>

      {/* Speech bubble on click */}
      <AnimatePresence>
        {expression === 'happy' && (
          <motion.div
            className={styles.speechBubble}
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <span className={styles.speechText}>
              {String.fromCodePoint(0x2665)} {"Let's play!"} {String.fromCodePoint(0x2665)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
