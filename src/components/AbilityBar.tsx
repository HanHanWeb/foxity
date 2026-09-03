"use client";

import { motion } from "framer-motion";
import type { HardSkillKey, VerifyStatus } from "@/types";
import { hardSkillMeta } from "@/types";
import { Tag } from "@/components/Tag";

interface AbilityBarProps {
  dimension: HardSkillKey;
  score: number;
  verified: VerifyStatus;
  delay?: number;
}

const statusLabel: Record<VerifyStatus, { label: string; tone: "mint" | "yellow" | "gray" }> = {
  verified: { label: "已验证", tone: "mint" },
  unverified: { label: "待验证", tone: "yellow" },
  untested: { label: "未涉及", tone: "gray" },
};

export function AbilityBar({ dimension, score, verified, delay = 0 }: AbilityBarProps) {
  const meta = hardSkillMeta.find((item) => item.key === dimension);
  const status = statusLabel[verified];
  const fillColor =
    verified === "verified" ? "bg-fox-orange" : verified === "unverified" ? "bg-fox-orange-light" : "bg-fox-gray";
  const Icon = meta?.icon;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-medium text-fox-navy">
          {Icon && <Icon className="h-4 w-4 text-fox-navy" />}
          <span>{meta?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular-nums font-semibold text-fox-navy">{score}/10</span>
          <Tag label={status.label} tone={status.tone} />
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-fox-gray-bg">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
          className={`h-full rounded-full ${fillColor}`}
        />
      </div>
    </div>
  );
}
