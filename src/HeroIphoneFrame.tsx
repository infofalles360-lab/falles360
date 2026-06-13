import { useId, type ReactNode } from "react";

const VB = { w: 393, h: 852 };

/** Recorte de pantalla alineado con el agujero del SVG (viewBox 393×852). */
const SCREEN = { x: 11.5, y: 13, w: 370, h: 826, r: 39 };

const OUTER_RX = 54;

/**
 * Marco tipo iPhone 15 Pro: bisel fino, titanio e isla dinámica.
 * El contenido va detrás del SVG; solo se ve por el agujero enmascarado.
 */
export function HeroIphoneFrame({
  featured = false,
  footer,
  children,
}: {
  featured?: boolean;
  children: ReactNode;
  footer: string;
}) {
  const uid = useId().replace(/:/g, "");
  const maskId = `hf-mask-${uid}`;
  const gradId = `hf-ti-${uid}`;
  const rimId = `hf-rim-${uid}`;

  const l = (SCREEN.x / VB.w) * 100;
  const t = (SCREEN.y / VB.h) * 100;
  const w = (SCREEN.w / VB.w) * 100;
  const h = (SCREEN.h / VB.h) * 100;
  const rxPct = `${(SCREEN.r / SCREEN.w) * 100}% / ${(SCREEN.r / SCREEN.h) * 100}%`;

  const islandW = featured ? 118 : 100;
  const islandH = featured ? 33 : 28;
  const islandX = (VB.w - islandW) / 2;
  const islandY = featured ? 13.5 : 12;

  return (
    <div className="relative isolate w-full [transform:translateZ(0)]">
      <div
        className={`pointer-events-none absolute ${featured ? "-bottom-4 h-11 w-[94%]" : "-bottom-3 h-9 w-[92%]"} left-1/2 -translate-x-1/2 rounded-[100%] bg-[#1a110a]/40 blur-2xl`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute ${featured ? "-bottom-2 h-6 w-[80%]" : "-bottom-1.5 h-5 w-[78%]"} left-1/2 -translate-x-1/2 rounded-[100%] bg-black/45 blur-md`}
        aria-hidden
      />

      <div className="relative mx-auto w-full" style={{ aspectRatio: `${VB.w} / ${VB.h}` }}>
        {/* Pantalla (debajo del marco SVG) */}
        <div
          className="absolute z-0 flex flex-col overflow-hidden bg-[#030201] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_3px_20px_rgba(255,255,255,0.04),inset_0_-12px_40px_rgba(0,0,0,0.55)]"
          style={{
            left: `${l}%`,
            top: `${t}%`,
            width: `${w}%`,
            height: `${h}%`,
            borderRadius: rxPct,
          }}
        >
          <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">{children}</div>
          <div
            className="pointer-events-none absolute inset-0 z-[18] bg-gradient-to-br from-white/[0.1] via-transparent to-transparent opacity-75 [mask-image:linear-gradient(135deg,black_0%,black_38%,transparent_70%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-[19] bg-gradient-to-tl from-transparent via-white/[0.02] to-transparent"
            aria-hidden
          />
        </div>

        {/* Botones físicos (HTML, alineados al chasis) */}
        <div
          className={`pointer-events-none absolute ${featured ? "-left-[3px] w-[3px]" : "-left-[2px] w-[2px]"} top-[19%] z-[5] h-10 rounded-full bg-gradient-to-b from-[#6a6561] via-[#353230] to-[#121110] shadow-[2px_0_3px_rgba(0,0,0,0.35)] sm:h-11`}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute ${featured ? "-left-[3px] w-[3px]" : "-left-[2px] w-[2px]"} top-[28%] z-[5] h-10 rounded-full bg-gradient-to-b from-[#6a6561] via-[#353230] to-[#121110] shadow-[2px_0_3px_rgba(0,0,0,0.35)] sm:h-11`}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute ${featured ? "-right-[3px] w-[3px]" : "-right-[2px] w-[2px]"} top-[22%] z-[5] h-[3.25rem] rounded-full bg-gradient-to-b from-[#6a6561] via-[#353230] to-[#121110] shadow-[-2px_0_3px_rgba(0,0,0,0.4)] sm:h-14`}
          aria-hidden
        />

        <svg
          className="pointer-events-none absolute inset-0 z-10 h-full w-full drop-shadow-[0_28px_56px_rgba(0,0,0,0.42),0_12px_24px_rgba(0,0,0,0.28)]"
          viewBox={`0 0 ${VB.w} ${VB.h}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="92%" y2="100%">
              <stop offset="0%" stopColor="#8a8580" />
              <stop offset="18%" stopColor="#4a4643" />
              <stop offset="42%" stopColor="#2a2826" />
              <stop offset="72%" stopColor="#151413" />
              <stop offset="100%" stopColor="#0a0908" />
            </linearGradient>
            <linearGradient id={rimId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="40%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
            </linearGradient>
            <mask id={maskId}>
              <rect width={VB.w} height={VB.h} fill="white" />
              <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} rx={SCREEN.r} ry={SCREEN.r} fill="black" />
            </mask>
          </defs>

          <rect width={VB.w} height={VB.h} rx={OUTER_RX} fill={`url(#${gradId})`} mask={`url(#${maskId})`} />

          <rect
            width={VB.w}
            height={VB.h}
            rx={OUTER_RX}
            fill="none"
            stroke={`url(#${rimId})`}
            strokeWidth={1.25}
            mask={`url(#${maskId})`}
            opacity={0.85}
          />

          {/* Línea de brillo superior en el bisel */}
          <path
            d={`M ${OUTER_RX + 18} 1.2 H ${VB.w - OUTER_RX - 18}`}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth={0.85}
            strokeLinecap="round"
            mask={`url(#${maskId})`}
          />

          {/* Isla dinámica */}
          <rect
            x={islandX}
            y={islandY}
            width={islandW}
            height={islandH}
            rx={islandH / 2}
            fill="#050504"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={0.45}
          />
          <rect
            x={islandX + 1}
            y={islandY + 1}
            width={islandW - 2}
            height={islandH - 2}
            rx={islandH / 2 - 1}
            fill="none"
            stroke="rgba(0,0,0,0.55)"
            strokeWidth={0.35}
          />
        </svg>
      </div>

      <div className="pointer-events-none mt-2 flex justify-center sm:mt-2.5">
        <div className="w-[96%] rounded-[1.25rem] border border-white/14 bg-gradient-to-b from-[#2a2420] to-[#14110e] py-2 shadow-[0_14px_36px_-14px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)] sm:rounded-[1.35rem] sm:py-2.5">
          <p className="text-center text-[7px] font-black uppercase tracking-[0.34em] text-[#d8cec6] sm:text-[8px] sm:tracking-[0.36em]">
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}
