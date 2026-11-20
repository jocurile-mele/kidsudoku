import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Eraser } from 'lucide-react';

interface NumberPadProps {
  digits: readonly number[];
  onSelect: (digit: number) => void;
  onDropOnTarget?: (digit: number, targetIndex: number) => void;
  onHoverDropTarget?: (targetIndex: number | null) => void;
  dropAttribute?: 'data-drop-quadrant' | 'data-drop-sudoku';
  triedWrong?: ReadonlySet<number>;
  solved: boolean;
  winningDigits?: ReadonlySet<number>;
  hintChoices?: readonly number[] | null;
  showErase?: boolean;
  onErase?: () => void;
}

interface DragState {
  digit: number;
  x: number;
  y: number;
  isTouch: boolean;
}

function splitRows(digits: readonly number[]): number[][] {
  if (digits.length <= 6) {
    return [[...digits]];
  }
  if (digits.length <= 11) {
    return [digits.slice(0, 6), digits.slice(6)];
  }
  // 0..20 (21 digits) -> 3 clean rows of 7
  return [digits.slice(0, 7), digits.slice(7, 14), digits.slice(14)];
}

export function NumberPad({
  digits,
  onSelect,
  onDropOnTarget,
  onHoverDropTarget,
  dropAttribute = 'data-drop-quadrant',
  triedWrong = new Set<number>(),
  solved,
  winningDigits,
  hintChoices = null,
  showErase = false,
  onErase,
}: NumberPadProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragSessionRef = useRef<{
    digit: number;
    startX: number;
    startY: number;
    dragging: boolean;
    pointerId: number;
    isTouch: boolean;
    lastDropIndex: number | null;
  } | null>(null);

  const findDropTarget = useCallback(
    (clientX: number, clientY: number): number | null => {
      if (typeof document === 'undefined' || !document.elementsFromPoint) {
        return null;
      }
      const els = document.elementsFromPoint(clientX, clientY);
      for (const el of els) {
        const dropEl = (el as HTMLElement).closest?.(`[${dropAttribute}]`);
        if (dropEl) {
          const raw = dropEl.getAttribute(dropAttribute);
          if (raw !== null) {
            const parsed = Number(raw);
            if (!Number.isNaN(parsed)) return parsed;
          }
        }
      }
      return null;
    },
    [dropAttribute],
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      const dist = Math.hypot(e.clientX - session.startX, e.clientY - session.startY);
      if (!session.dragging && dist >= 10) {
        session.dragging = true;
      }

      if (session.dragging) {
        setDrag({
          digit: session.digit,
          x: e.clientX,
          y: e.clientY,
          isTouch: session.isTouch,
        });
        const hit = findDropTarget(e.clientX, e.clientY);
        if (hit !== session.lastDropIndex) {
          session.lastDropIndex = hit;
          onHoverDropTarget?.(hit);
        }
      }
    };

    const finishPointer = (e: PointerEvent, cancelled: boolean) => {
      const session = dragSessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      dragSessionRef.current = null;
      setDrag(null);
      onHoverDropTarget?.(null);

      if (cancelled) return;

      if (session.dragging) {
        const hit = findDropTarget(e.clientX, e.clientY);
        if (hit !== null && onDropOnTarget) {
          onDropOnTarget(session.digit, hit);
        }
      } else {
        onSelect(session.digit);
      }
    };

    const onUp = (e: PointerEvent) => finishPointer(e, false);
    const onCancel = (e: PointerEvent) => finishPointer(e, true);

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [findDropTarget, onDropOnTarget, onHoverDropTarget, onSelect]);

  const rows = splitRows(digits);
  const isCompact20 = digits.length > 12;
  const isFourKey = digits.length === 4;

  const keySizeClass = isCompact20
    ? 'w-[clamp(37px,11.8vw,48px)] h-[clamp(38px,10.5vw,46px)] rounded-xl text-lg sm:text-xl'
    : isFourKey
      ? 'w-[62px] h-[58px] sm:w-[68px] sm:h-[64px] rounded-2xl text-2xl sm:text-[28px]'
      : 'w-[clamp(42px,13.4vw,58px)] h-[clamp(46px,13vw,60px)] [@media(max-height:700px)]:h-[46px] [@media(orientation:landscape)_and_(max-height:520px)]:w-[46px] [@media(orientation:landscape)_and_(max-height:520px)]:h-[44px] [@media(orientation:landscape)_and_(max-height:520px)]:text-xl rounded-2xl text-[22px] sm:text-[26px]';

  const renderKey = (digit: number) => {
    const isTriedWrong = triedWrong.has(digit);
    const isWinningKey = solved && Boolean(winningDigits?.has(digit));
    const isHintCandidate =
      !solved && !isTriedWrong && hintChoices !== null && hintChoices.includes(digit);
    const isDimmedByHint =
      !solved && !isTriedWrong && hintChoices !== null && !hintChoices.includes(digit);
    const disabled = solved || isTriedWrong;

    let styleClass = 'num-key text-ink';
    if (isWinningKey) {
      styleClass = 'num-key-correct border-sage text-sage-deep';
    } else if (isTriedWrong) {
      styleClass = 'num-key-tried text-[var(--cs-ink-muted)] opacity-55';
    } else if (isHintCandidate) {
      styleClass = 'num-key-hint border-amber-warm text-amber-deep';
    } else if (isDimmedByHint) {
      styleClass = 'num-key text-ink opacity-40';
    } else if (solved) {
      styleClass = 'num-key text-ink opacity-45';
    }

    return (
      <motion.button
        key={digit}
        type="button"
        disabled={disabled}
        onPointerDown={(e) => {
          if (disabled || e.button > 0) return;
          dragSessionRef.current = {
            digit,
            startX: e.clientX,
            startY: e.clientY,
            dragging: false,
            pointerId: e.pointerId,
            isTouch: e.pointerType === 'touch',
            lastDropIndex: null,
          };
        }}
        onClick={(e) => {
          // Support keyboard activation (Enter/Space on focused button has detail === 0)
          if (disabled || e.detail !== 0) return;
          onSelect(digit);
        }}
        whileTap={disabled ? undefined : { y: 3, scale: 0.96 }}
        animate={
          isWinningKey
            ? { scale: [1, 1.12, 1.04] }
            : isHintCandidate
              ? { scale: [1, 1.04, 1] }
              : { scale: 1 }
        }
        transition={{ type: 'spring', stiffness: 520, damping: 22 }}
        aria-label={`Choose ${digit}`}
        style={{ touchAction: 'none' }}
        className={`relative border font-display font-bold flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm ${keySizeClass} ${
          disabled ? 'cursor-default' : 'cursor-pointer'
        } ${styleClass}`}
      >
        {digit}
      </motion.button>
    );
  };

  return (
    <>
      <div
        className={`w-full max-w-md mx-auto flex flex-col items-center ${
          isCompact20 ? 'gap-1.5 sm:gap-2' : 'gap-2 sm:gap-3'
        }`}
        role="group"
        aria-label={`Number choices from ${digits[0]} to ${digits[digits.length - 1]}`}
      >
        {rows.map((row, rIdx) => (
          <div
            key={rIdx}
            className={`flex items-center justify-center ${
              isCompact20 ? 'gap-1 sm:gap-1.5' : 'gap-1.5 sm:gap-2.5'
            }`}
          >
            {row.map(renderKey)}
            {showErase && onErase && rIdx === rows.length - 1 && (
              <motion.button
                type="button"
                disabled={solved}
                onClick={onErase}
                whileTap={solved ? undefined : { y: 3, scale: 0.96 }}
                aria-label="Clear selected cell"
                title="Clear selected cell"
                className="w-[54px] h-[58px] sm:w-[60px] sm:h-[64px] rounded-2xl border num-key text-ink-soft flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm"
              >
                <Eraser className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        ))}
      </div>

      {/* Floating dragged wooden tile */}
      {drag && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: drag.x,
            top: drag.y - (drag.isTouch ? 34 : 8),
            transform: 'translate(-50%, -50%) scale(1.12) rotate(-3deg)',
            pointerEvents: 'none',
            zIndex: 60,
          }}
          className="w-14 h-14 rounded-2xl border-2 border-amber-warm num-key-hint font-display text-2xl font-bold text-amber-deep flex items-center justify-center shadow-[0_14px_28px_-6px_rgba(0,0,0,0.28)]"
        >
          {drag.digit}
        </div>
      )}
    </>
  );
}
