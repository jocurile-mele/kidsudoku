import { motion } from "motion/react";
import { Award, Star } from "lucide-react";
import { SET_SIZE } from "../game/puzzle";

interface StarTrackProps {
  starsInSet: number;
  setsCompleted: number;
}

export function StarTrack({ starsInSet, setsCompleted }: StarTrackProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f4ede0]/90 border border-[#e5dac6]"
        aria-label={`Set progress: ${starsInSet} of ${SET_SIZE} stars`}
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
                    : "text-[#d4c8b2] fill-transparent"
                }`}
              />
            </motion.div>
          );
        })}
      </div>

      {setsCompleted > 0 && (
        <motion.div
          key={`sets-${setsCompleted}`}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sage-wash border border-[#c2e1d2] text-sage-deep text-xs font-bold"
          title={`${setsCompleted} ${setsCompleted === 1 ? "set" : "sets"} completed`}
        >
          <Award className="w-3.5 h-3.5" />
          <span className="font-display">
            {setsCompleted} {setsCompleted === 1 ? "set" : "sets"}
          </span>
        </motion.div>
      )}
    </div>
  );
}
