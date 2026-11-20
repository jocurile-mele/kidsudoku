interface DominoPipsProps {
  value: number;
  colorClass?: string;
}

export function DominoPips({ value, colorClass = "bg-ink/45" }: DominoPipsProps) {
  if (value <= 0) {
    return (
      <span
        aria-hidden="true"
        className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/65"
      >
        zero
      </span>
    );
  }

  const compact = value > 10;

  return (
    <div
      aria-hidden="true"
      className={`grid justify-items-center ${
        value <= 5 ? "grid-flow-col gap-1" : "grid-cols-5 gap-[3px]"
      }`}
    >
      {Array.from({ length: value }, (_, i) => (
        <span
          key={i}
          className={`rounded-full ${colorClass} ${compact ? "w-1.5 h-1.5" : "w-2 h-2"}`}
        />
      ))}
    </div>
  );
}
