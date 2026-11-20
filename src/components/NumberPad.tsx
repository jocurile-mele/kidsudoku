import { motion } from 'motion/react';

const TOP_ROW = [0, 1, 2, 3, 4, 5] as const;
const BOTTOM_ROW = [6, 7, 8, 9, 10] as const;

interface NumberPadProps {
  onSelect: (digit: number) => void;
  triedWrong: ReadonlySet<number>;
  solved: boolean;
  answer: number;
  hintChoices: readonly number[] | null;
}

export function NumberPad({
  onSelect,
  triedWrong,
  solved,
  answer,
  hintChoices,
}: NumberPadProps) {
  const renderKey = (digit: number) => {
    const isTriedWrong = triedWrong.has(digit);
    const isWinningKey = solved && digit === answer;
    const isHintCandidate =
      !solved && !isTriedWrong && hintChoices !== null && hintChoices.includes(digit);
    const isDimmedByHint =
      !solved && !isTriedWrong && hintChoices !== null && !hintChoices.includes(digit);
    const disabled = solved || isTriedWrong;

    let styleClass = 'num-key border-[#e4dac6] text-ink';
    if (isWinningKey) {
      styleClass = 'num-key-correct border-sage text-sage-deep';
    } else if (isTriedWrong) {
      styleClass = 'num-key-tried border-[#e5dccb] text-[#b4a895] opacity-55';
    } else if (isHintCandidate) {
      styleClass = 'num-key-hint border-amber-warm text-amber-deep';
    } else if (isDimmedByHint) {
      styleClass = 'num-key border-[#e4dac6] text-ink opacity-40';
    } else if (solved) {
      styleClass = 'num-key border-[#e4dac6] text-ink opacity-45';
    }

    return (
      <motion.button
        key={digit}
        type="button"
        disabled={disabled}
        onClick={() => onSelect(digit)}
        whileHover={disabled ? undefined : { y: -2 }}
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
        className={`relative w-12 h-[52px] sm:w-[58px] sm:h-[60px] rounded-2xl border font-display text-2xl sm:text-[26px] font-bold flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm ${
          disabled ? 'cursor-default' : 'cursor-pointer'
        } ${styleClass}`}
      >
        {digit}
      </motion.button>
    );
  };

  return (
    <div
      className="w-full max-w-md mx-auto flex flex-col items-center gap-2.5 sm:gap-3"
      role="group"
      aria-label="Number choices from 0 to 10"
    >
      <div className="flex items-center justify-center gap-2 sm:gap-2.5">
        {TOP_ROW.map(renderKey)}
      </div>
      <div className="flex items-center justify-center gap-2 sm:gap-2.5">
        {BOTTOM_ROW.map(renderKey)}
      </div>
    </div>
  );
}
