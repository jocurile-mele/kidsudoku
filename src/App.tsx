import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { DEFAULT_MODE_ID, GAME_MODES, getGameMode } from "./modes";
import type { ModeProgressSnapshot } from "./modes/contract";
import { getTodayDateKey } from "./platform/date";
import { soundEngine, triggerHaptic } from "./platform/sound";
import { StampIcon } from "./rewards/StampIcon";
import { StampShelfModal } from "./rewards/StampShelfModal";
import type { StampId, ThemeId } from "./rewards/stamps";
import { useProgress, type TargetSum } from "./state/useProgress";
import { Header } from "./ui/Header";
import { HowToPlayModal } from "./ui/HowToPlayModal";
import { ModeBar, type ModeBarItem } from "./ui/ModeBar";
import { SettingsModal } from "./ui/SettingsModal";

export default function App() {
  const todayKey = useMemo(() => getTodayDateKey(), []);
  const progressStore = useProgress(todayKey);
  const { progress, rewardCount, hasUnseenReward, dailyCompletedToday, unlockedToast } =
    progressStore;

  const [modeId, setModeId] = useState<string>(DEFAULT_MODE_ID);
  const [streak, setStreak] = useState(0);
  const [modeProgress, setModeProgress] = useState<ModeProgressSnapshot>({
    starsInSet: 0,
    setSize: 5,
    dailyLabel: null,
  });

  const [helpOpen, setHelpOpen] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoPlaying, setLogoPlaying] = useState(false);
  const [logoPressCount, setLogoPressCount] = useState(0);

  const activeMode = getGameMode(modeId);
  const modalsOpen = helpOpen || shelfOpen || settingsOpen;

  // Unlock iOS Safari AudioContext & pre-decode logo clip on first user touch/click
  useEffect(() => {
    const unlockOnce = () => {
      soundEngine.unlock();
      window.removeEventListener("pointerdown", unlockOnce);
    };
    window.addEventListener("pointerdown", unlockOnce, { passive: true });
    return () => window.removeEventListener("pointerdown", unlockOnce);
  }, []);

  const handleChangeMode = useCallback((nextModeId: string) => {
    setModeId((prev) => {
      if (prev === nextModeId) return prev;
      soundEngine.playTap();
      triggerHaptic("tap");
      return nextModeId;
    });
  }, []);

  const handleToggleSound = useCallback(() => {
    triggerHaptic("tap");
    progressStore.toggleSound(() => setLogoPlaying(false));
  }, [progressStore]);

  const handleOpenShelf = useCallback(() => {
    soundEngine.playTap();
    triggerHaptic("tap");
    setShelfOpen(true);
    progressStore.markRewardsSeen();
  }, [progressStore]);

  const handleLogoClick = useCallback(() => {
    triggerHaptic("tap");
    setLogoPressCount((c) => c + 1);
    const started = soundEngine.playLogoClip(() => {
      setLogoPlaying(false);
    });
    if (started) {
      setLogoPlaying(true);
    }
  }, []);

  const handleSelectTheme = useCallback(
    (theme: ThemeId) => {
      soundEngine.playTap();
      triggerHaptic("tap");
      progressStore.setTheme(theme);
    },
    [progressStore],
  );

  const handlePinStamp = useCallback(
    (stampId: StampId | null) => {
      soundEngine.playTap();
      triggerHaptic("tap");
      progressStore.pinStamp(stampId);
    },
    [progressStore],
  );

  const handleChangeTargetSum = useCallback(
    (nextTarget: TargetSum) => {
      if (nextTarget === progress.targetSum) return;
      soundEngine.playTap();
      triggerHaptic("tap");
      progressStore.setTargetSum(nextTarget);
    },
    [progress.targetSum, progressStore],
  );

  // Global shell keyboard shortcuts (Escape closes modals, M toggles sound)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (modalsOpen) {
        if (e.key === "Escape") {
          setHelpOpen(false);
          setShelfOpen(false);
          setSettingsOpen(false);
        }
        return;
      }
      if (e.key === "m" || e.key === "M") {
        handleToggleSound();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleToggleSound, modalsOpen]);

  const modeBarItems: ModeBarItem[] = useMemo(
    () =>
      GAME_MODES.map((m) => ({
        id: m.id,
        shortLabel: m.shortLabel,
        icon: m.renderIcon({ dailyCompletedToday }),
      })),
    [dailyCompletedToday],
  );

  const ActiveModeComponent = activeMode.Component;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh safe-shell flex flex-col justify-between">
        <Header
          totalSolved={progress.totalSolved}
          streak={streak}
          bestStreak={progress.bestStreak}
          soundEnabled={progress.soundEnabled}
          logoPlaying={logoPlaying}
          logoPressCount={logoPressCount}
          hasUnseenReward={hasUnseenReward}
          onLogoClick={handleLogoClick}
          onOpenShelf={handleOpenShelf}
          onToggleSound={handleToggleSound}
          onOpenSettings={() => {
            soundEngine.playTap();
            triggerHaptic("tap");
            setSettingsOpen(true);
          }}
          onOpenHelp={() => {
            soundEngine.playTap();
            triggerHaptic("tap");
            setHelpOpen(true);
          }}
        />

        {/* Auto-discovered Mode Switcher */}
        <div className="w-full flex justify-center px-3 pt-1 pb-1">
          <ModeBar
            modes={modeBarItems}
            activeModeId={activeMode.id}
            onChangeMode={handleChangeMode}
          />
        </div>

        {/* Stamp unlock toast */}
        <AnimatePresence>
          {unlockedToast && (
            <motion.button
              type="button"
              onClick={handleOpenShelf}
              initial={{ opacity: 0, y: -16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.94 }}
              className="fixed top-16 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-3.5 py-2 rounded-full cs-surface border border-amber-warm shadow-[0_12px_28px_-8px_rgba(0,0,0,0.28)] cursor-pointer"
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: unlockedToast.wash,
                  color: unlockedToast.accent,
                }}
              >
                <StampIcon id={unlockedToast.id} className="w-5 h-5" />
              </span>
              <span className="text-xs sm:text-sm font-bold text-ink">
                New stamp unlocked:{" "}
                <strong className="text-amber-deep">{unlockedToast.name}</strong>!
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Active owned mode */}
        <ActiveModeComponent
          key={activeMode.id}
          todayKey={todayKey}
          streak={streak}
          onStreakChange={setStreak}
          progressStore={progressStore}
          modalsOpen={modalsOpen}
          onChangeMode={handleChangeMode}
          onOpenShelf={handleOpenShelf}
          onProgressSnapshot={setModeProgress}
        />

        <StampShelfModal
          open={shelfOpen}
          onClose={() => setShelfOpen(false)}
          totalSolved={progress.totalSolved}
          rewardCount={rewardCount}
          activeTheme={progress.theme}
          onSelectTheme={handleSelectTheme}
          pinnedStampId={progress.pinnedStampId}
          onPinStamp={handlePinStamp}
        />

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          supportsTargetSum={activeMode.supportsTargetSum}
          targetSum={progress.targetSum}
          onChangeTargetSum={handleChangeTargetSum}
          starsInSet={modeProgress.starsInSet}
          setSize={modeProgress.setSize}
          setsCompleted={progress.setsCompleted}
          pinnedStampId={progress.pinnedStampId}
          dailyLabel={modeProgress.dailyLabel}
          onOpenShelf={() => {
            setSettingsOpen(false);
            handleOpenShelf();
          }}
        />

        <HowToPlayModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </MotionConfig>
  );
}
