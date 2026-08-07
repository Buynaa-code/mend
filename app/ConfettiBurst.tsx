"use client";

import {
  type CSSProperties,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type ConfettiBurstHandle = {
  /** Дэлгэцийн (clientX / clientY) цэгээс confetti дэлбэлнэ. */
  burst: (x: number, y: number) => void;
};

/** CSS анимацийн үргэлжлэх хугацаа (`confettiFly`) — цэвэрлэгээ үүнтэй уялдана. */
const burstLifetimeMs = 1500;
const defaultPieceCount = 22;
const confettiColors = [
  "#ff6f91",
  "#ffd84c",
  "#4cc9f0",
  "#8ce99a",
  "#c77dff",
  "#ff9f1c",
];

type Piece = { id: number; style: CSSProperties };
type Burst = { id: number; x: number; y: number; pieces: Piece[] };

function createPieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 90 + Math.random() * 130;
    return {
      id: index,
      style: {
        "--confetti-dx": `${Math.round(Math.cos(angle) * distance)}px`,
        "--confetti-dy": `${Math.round(Math.sin(angle) * distance - 40)}px`,
        "--confetti-rotate": `${Math.round(Math.random() * 720 - 360)}deg`,
        "--confetti-delay": `${Math.round(Math.random() * 90)}ms`,
        background: confettiColors[index % confettiColors.length],
      } as CSSProperties,
    };
  });
}

/**
 * Дэлгэц даяар байрлах confetti давхарга. Эцэг компонент `ref`-ээр
 * дуудна:
 *
 * ```tsx
 * const confetti = useRef<ConfettiBurstHandle>(null);
 * <ConfettiBurst ref={confetti} />
 * confetti.current?.burst(event.clientX, event.clientY);
 * ```
 */
export function ConfettiBurst({
  ref,
  pieceCount = defaultPieceCount,
}: {
  ref?: Ref<ConfettiBurstHandle>;
  pieceCount?: number;
}) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextIdRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    },
    [],
  );

  const burst = useCallback(
    (x: number, y: number) => {
      const id = (nextIdRef.current += 1);
      setBursts((current) => [
        ...current,
        { id, x, y, pieces: createPieces(pieceCount) },
      ]);
      const timer = window.setTimeout(() => {
        setBursts((current) => current.filter((item) => item.id !== id));
        timersRef.current = timersRef.current.filter(
          (item) => item !== timer,
        );
      }, burstLifetimeMs);
      timersRef.current.push(timer);
    },
    [pieceCount],
  );

  useImperativeHandle(ref, () => ({ burst }), [burst]);

  return (
    <div className="confetti-layer" aria-hidden="true">
      {bursts.map((item) => (
        <span
          className="confetti-burst"
          key={item.id}
          style={{ left: item.x, top: item.y }}
        >
          {item.pieces.map((piece) => (
            <i key={piece.id} style={piece.style} />
          ))}
        </span>
      ))}
    </div>
  );
}
