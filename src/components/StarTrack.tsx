import { motion } from "motion/react";
import { Award, CalendarDays, Star } from "lucide-react";
import { SET_SIZE } from "../game/puzzle";
import { STAMPS, type StampId } from "../game/stamps";
import { StampIcon } from "./StampIcon";

interface StarTrackProps {
  starsInSet: number;
  setsCompleted: number;
  pinnedStampId: StampId | null;
  onOpenShelf: () => void;
  dailyLabel?: string | null;
}

export function StarTrack({
  starsInSet,
  setsCompleted,
  pinnedStampId,
  onOpenShelf,
  dailyLabel = null,
}: StarTrackProps) {
  const pinnedStamp = pinnedStampId ? (STAMPS.find((s) => s.id === pinnedStampId) ?? null) : null;

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {dailyLabel && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-wash border border-amber-warm/45 text-amber-deep text-xs font-bold">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{dailyLabel}</span>
        </span>
      )}

      <div
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full cs-muted-pill border"
        aria-label={`Progress: ${starsInSet} of ${SET_SIZE} stars`}
      >
        {Array.from({ length: SET_SIZE }, (_, idx) => {
          const filled = idx < starsInSet;
          return (
            <motion.div
              key={idx}
              initial={false}
              animate={
                filled ? { scale: [0.65, 1.25, 1], rotate: [-14, 6, 0] } : { scale: 1, rotate: 0 }
              }
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className="flex items-center justify-center"
            >
              <Star
                className={`w-4 h-4 transition-colors duration-200 ${
                  filled
                    ? "text-amber-warm fill-amber-warm drop-shadow-[0_1px_2px_rgba(230,162,53,0.35)]"
                    : "text-[var(--cs-ink-muted)]/60 fill-transparent"
                }`}
              />
            </motion.div>
          );
        })}
      </div>

      {!dailyLabel && setsCompleted > 0 && (
        <motion.div
          key={`sets-${setsCompleted}`}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sage-wash border border-sage/45 text-sage-deep text-xs font-bold"
          title={`${setsCompleted} ${setsCompleted === 1 ? "set" : "sets"} completed`}
        >
          <Award className="w-3.5 h-3.5" />
          <span className="font-display">
            {setsCompleted} {setsCompleted === 1 ? "set" : "sets"}
          </span>
        </motion.div>
      )}

      {pinnedStamp && (
        <button
          type="button"
          onClick={onOpenShelf}
          title={`Pinned stamp: ${pinnedStamp.name}`}
          className="w-7 h-7 rounded-full border flex items-center justify-center shadow-xs cursor-pointer transition active:scale-95"
          style={{
            backgroundColor: pinnedStamp.wash,
            color: pinnedStamp.accent,
            borderColor: `${pinnedStamp.accent}44`,
          }}
        >
          <StampIcon id={pinnedStamp.id} className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
