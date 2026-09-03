import type { HardSkillKey, DimensionStatus } from "@/types";
import { hardSkillMeta } from "@/types";

interface ProgressIndicatorProps {
  covered: Record<HardSkillKey, DimensionStatus>;
}

const statusStyle: Record<DimensionStatus, { dot: string; text: string; pulse?: boolean }> = {
  untested: { dot: "bg-fox-gray", text: "未测" },
  in_progress: { dot: "bg-fox-orange animate-pulse", text: "进行中", pulse: true },
  done: { dot: "bg-fox-mint", text: "已完成" },
};

export function ProgressIndicator({ covered }: ProgressIndicatorProps) {
  return (
    <div className="space-y-2">
      {hardSkillMeta.map((dim) => {
        const status = statusStyle[covered[dim.key]];
        return (
          <div key={dim.key} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-fox-navy">
              <dim.icon className="h-3.5 w-3.5" />
              <span className="font-medium">{dim.shortName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-fox-gray">
              <span className={`h-2 w-2 rounded-full ${status.dot}`} />
              <span>{status.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
