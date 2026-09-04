import { motion } from "framer-motion";

interface HeaderProps {
  act: number;
  actTitle: string;
  totalActs: number;
}

export default function Header({ act, actTitle, totalActs }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-brass-500/12 bg-ink-900/80 backdrop-blur-sm relative z-20">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-brass-300">
            <path
              d="M3 10 Q 5 4, 10 6 T 17 10 Q 15 16, 10 14 T 3 10"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
              opacity="0.8"
            />
            <circle cx="6" cy="8.5" r="1" fill="currentColor" opacity="0.6" />
            <circle cx="10" cy="10" r="1.2" fill="currentColor" />
            <circle cx="14" cy="9" r="1" fill="currentColor" opacity="0.6" />
          </svg>
          <h1 className="font-serif text-lg text-bone tracking-wide" style={{ color: "#E8E1D3" }}>
            break the dragon
          </h1>
        </div>
        <p className="font-mono text-xs hidden sm:block" style={{ color: "#A8A092" }}>
          a small memory learns a rule, then we break it four ways to learn why the architecture exists
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <motion.span
            className="block w-2 h-2 rounded-full bg-brass-300"
            style={{ backgroundColor: "#C9A66B" }}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="font-mono text-xs" style={{ color: "#948A7A" }}>live</span>
        </div>
        <div className="font-mono text-xs" style={{ color: "#948A7A" }}>
          act {act} of {totalActs} —{" "}
          <span style={{ color: "#C9A66B" }}>{actTitle}</span>
        </div>
      </div>
    </header>
  );
}
