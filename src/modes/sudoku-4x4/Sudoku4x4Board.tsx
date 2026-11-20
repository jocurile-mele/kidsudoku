import { type RefObject } from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import {
  getBoxCells,
  getBoxIndex,
  getCol,
  getRow,
  isBoxComplete,
  type Sudoku4x4Puzzle,
} from "./sudoku4x4";

interface Sudoku4x4BoardProps {
  puzzle: Sudoku4x4Puzzle;
  board: Array<number | null>;
  selectedIndex: number | null;
  onSelectCell: (index: number) => void;
  conflictIndices: ReadonlySet<number>;
  conflictKey: number;
  hoveredDropIndex: number | null;
  solved: boolean;
  boardRef: RefObject<HTMLDivElement | null>;
}

export function Sudoku4x4Board({
  puzzle,
  board,
  selectedIndex,
  onSelectCell,
  conflictIndices,
  conflictKey,
  hoveredDropIndex,
  solved,
  boardRef,
}: Sudoku4x4BoardProps) {
  const selectedRow = selectedIndex !== null ? getRow(selectedIndex) : -1;
  const selectedCol = selectedIndex !== null ? getCol(selectedIndex) : -1;
  const selectedBox = selectedIndex !== null ? getBoxIndex(selectedIndex) : -1;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Rule chip */}
      <div className="mb-2.5 flex items-center gap-2">
        <motion.div
          animate={solved ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 0.35 }}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold border transition-colors ${
            solved ? "bg-sage-wash border-sage/50 text-sage-deep" : "cs-surface text-ink-soft"
          }`}
        >
          {solved ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-sage" />
              <span>Every box, row &amp; column makes 10!</span>
            </>
          ) : (
            <span>Use 1–4 · each row, column &amp; 2×2 box = 10</span>
          )}
        </motion.div>
      </div>

      {/* Four 2x2 boxes arranged in a 2x2 outer tray */}
      <div
        ref={boardRef}
        role="grid"
        aria-label="4 by 4 KidSudoku board"
        className={`board-tray p-2.5 sm:p-3 rounded-[26px] border transition-colors duration-300 w-[clamp(248px,76vw,312px)] h-[clamp(248px,76vw,312px)] [@media(max-height:700px)]:w-[238px] [@media(max-height:700px)]:h-[238px] [@media(orientation:landscape)_and_(max-height:520px)]:w-[216px] [@media(orientation:landscape)_and_(max-height:520px)]:h-[216px] grid grid-cols-2 grid-rows-2 gap-2.5 sm:gap-3 ${
          solved ? "border-sage/70 ring-4 ring-sage/15" : ""
        }`}
      >
        {[0, 1, 2, 3].map((boxIndex) => {
          const boxDone = isBoxComplete(board, boxIndex);
          const cellIndices = getBoxCells(boxIndex);

          return (
            <div
              key={boxIndex}
              className={`grid grid-cols-2 grid-rows-2 gap-1.5 p-1.5 rounded-2xl border transition-colors duration-300 ${
                boxDone
                  ? "bg-sage-wash/55 border-sage/45"
                  : "bg-black/[0.03] border-[var(--cs-border)]/70"
              }`}
            >
              {cellIndices.map((cellIndex) => {
                const isGiven = puzzle.givens[cellIndex] !== null;
                const value = board[cellIndex];
                const isSelected = !solved && selectedIndex === cellIndex;
                const isRelated =
                  !solved &&
                  selectedIndex !== null &&
                  !isSelected &&
                  (getRow(cellIndex) === selectedRow ||
                    getCol(cellIndex) === selectedCol ||
                    getBoxIndex(cellIndex) === selectedBox);
                const isConflict = conflictIndices.has(cellIndex);
                const isDropHover = !solved && !isGiven && hoveredDropIndex === cellIndex;

                return (
                  <motion.button
                    key={`${puzzle.id}-${cellIndex}-${isConflict ? conflictKey : 0}`}
                    type="button"
                    data-drop-sudoku={!isGiven && !solved ? cellIndex : undefined}
                    onClick={() => {
                      if (!isGiven && !solved) {
                        onSelectCell(cellIndex);
                      }
                    }}
                    disabled={isGiven && !solved}
                    role="gridcell"
                    aria-label={`Row ${getRow(cellIndex) + 1} column ${getCol(cellIndex) + 1}: ${
                      value !== null ? value : "empty"
                    }`}
                    animate={
                      isConflict
                        ? { x: [0, -5, 5, -3, 3, 0] }
                        : isDropHover
                          ? { scale: 1.07 }
                          : { scale: 1, x: 0 }
                    }
                    transition={
                      isConflict
                        ? { duration: 0.36 }
                        : { type: "spring", stiffness: 460, damping: 24 }
                    }
                    className={`rounded-xl flex items-center justify-center font-display text-2xl sm:text-[28px] font-bold leading-none transition-colors select-none focus-visible:outline-2 focus-visible:outline-amber-warm ${
                      isGiven ? "cursor-default" : solved ? "cursor-default" : "cursor-pointer"
                    } ${
                      isConflict
                        ? "tile-wrong border-2 border-coral text-coral-deep"
                        : solved
                          ? "tile-solved border border-sage/60 text-sage-deep"
                          : isDropHover
                            ? "tile-missing border-2 border-amber-warm ring-2 ring-amber-warm/35 text-amber-deep"
                            : isSelected
                              ? "tile-missing border-2 border-dashed border-amber-warm ring-2 ring-amber-warm/25 text-amber-deep"
                              : isGiven
                                ? `tile-given border border-[var(--cs-border)] text-ink ${
                                    isRelated ? "brightness-[0.97]" : ""
                                  }`
                                : value !== null
                                  ? "tile-given border border-sage/55 text-sage-deep"
                                  : isRelated
                                    ? "bg-amber-wash/45 border border-dashed border-amber-warm/40 text-amber-warm/50"
                                    : "cs-surface border border-dashed border-[var(--cs-border-strong)] text-ink-soft/45"
                    }`}
                  >
                    {value !== null ? value : isSelected ? "?" : ""}
                  </motion.button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
