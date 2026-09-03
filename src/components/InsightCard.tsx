import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface InsightCardProps {
  icon?: React.ReactNode;
  text: string;
  index?: number;
}

export function InsightCard({ icon, text, index = 0 }: InsightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      className="rounded-lg border border-fox-gray-light bg-fox-cream p-3 text-xs text-fox-navy shadow-sm"
    >
      <div className="flex items-start gap-2">
        {icon ?? <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fox-orange" />}
        <span className="leading-relaxed">{text}</span>
      </div>
    </motion.div>
  );
}
