"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dimensions } from "@/mock/data";
import type { UserProfile, Ability } from "@/types";
import { cn } from "@/lib/utils";

interface TeamMatrixProps {
  profiles: UserProfile[];
}

export function TeamMatrix({ profiles }: TeamMatrixProps) {
  const [mode, setMode] = useState<"table" | "heatmap">("table");

  const getHeatColor = (score: number, status: string) => {
    if (status === "untested") return "bg-fox-gray-bg text-fox-gray-light";
    if (score >= 7) return "bg-fox-orange text-white";
    if (score >= 4) return "bg-fox-orange-light/60 text-fox-navy";
    return "bg-fox-cream text-fox-navy";
  };

  if (profiles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-fox-gray-light bg-white p-10 text-center">
        <p className="text-sm text-fox-gray">暂无成员完成测评，邀请队友来看看能力矩阵吧。</p>
      </div>
    );
  }

  return (
    <div className="fox-card overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-base font-semibold text-fox-navy">团队能力矩阵</h3>
        <div className="flex gap-1 rounded-full bg-fox-gray-bg p-1">
          <Button size="sm" variant={mode === "table" ? "default" : "ghost"} onClick={() => setMode("table")}>
            表格
          </Button>
          <Button size="sm" variant={mode === "heatmap" ? "default" : "ghost"} onClick={() => setMode("heatmap")}>
            热力图
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[120px_repeat(5,minmax(90px,1fr))] bg-fox-navy text-sm font-semibold text-white">
            <div className="p-3">队员</div>
            {dimensions.map((dim) => (
              <div key={dim.key} className="p-3 text-center">
              <dim.icon className="mr-1 inline h-4 w-4 align-[-2px]" /> {dim.shortName}
            </div>
            ))}
          </div>

          {profiles.map((profile) => (
            <div key={profile.user_id} className="grid grid-cols-[120px_repeat(5,minmax(90px,1fr))] border-t border-fox-gray-light text-sm hover:bg-fox-cream/50">
              <div className="p-3 font-medium text-fox-navy">{profile.user_name}</div>
              {dimensions.map((dim) => {
                const ability = profile.abilities?.[dim.key] ?? { score: 0, verification_status: "untested" };
                if (mode === "heatmap") {
                  return (
                    <div key={dim.key} className={cn("p-3 text-center font-semibold", getHeatColor(ability.score, ability.verification_status))}>
                      {ability.verification_status === "untested" ? "—" : `${ability.score}`}
                    </div>
                  );
                }
                return (
                  <div key={dim.key} className="flex items-center justify-center gap-1 p-3">
                    <span className={cn("font-semibold", ability.verification_status === "verified" ? "text-fox-navy" : "text-fox-gray")}>
                      {ability.verification_status === "untested" ? "—" : ability.score}
                    </span>
                    <span className="inline-flex text-fox-gray" title={ability.verification_status === "verified" ? "已验证" : ability.verification_status === "unverified" ? "待验证" : "未涉及"}>
                      {ability.verification_status === "verified" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-fox-mint" />
                      ) : ability.verification_status === "unverified" ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <HelpCircle className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="grid grid-cols-[120px_repeat(5,minmax(90px,1fr))] border-t border-fox-gray-light bg-fox-gray-bg text-sm font-semibold text-fox-navy">
            <div className="p-3">团队均分</div>
            {dimensions.map((dim) => {
              const validScores = profiles
                .map((profile) => profile.abilities?.[dim.key])
                .filter((ability): ability is Ability =>
                  !!ability && ability.verification_status !== "untested"
                );
              const avg =
                validScores.length > 0
                  ? validScores.reduce((sum, ability) => sum + ability.score, 0) / validScores.length
                  : 0;
              return <div key={dim.key} className="p-3 text-center tabular-nums">{avg ? avg.toFixed(1) : "—"}</div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
