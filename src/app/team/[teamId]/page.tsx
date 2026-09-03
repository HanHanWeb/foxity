"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Share2,
  Check,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  UserMinus,
  Pencil,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/CopyButton";
import { useStore } from "@/store/useStore";
import type { HardSkillKey, UserProfile } from "@/types";
import { hardSkillLabels, hardSkillMeta, twelveTypeIcons } from "@/types";
import {
  analyzeTeam,
  getMemberStatus,
  isAssessmentCompleted,
} from "@/lib/team-analysis";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

// 预设职位清单
const PRESET_POSITIONS = [
  "队长",
  "产品负责人",
  "技术负责人",
  "前端开发",
  "后端开发",
  "设计师",
  "市场运营",
  "财务商务",
  "数据分析",
];

// 5 个硬技能维度 key
const HARD_SKILL_KEYS: HardSkillKey[] = [
  "market_analysis",
  "product_thinking",
  "technical",
  "business_finance",
  "design",
];

// 取成员的验证分（v3_score_data.verified_scores 优先，否则回退 abilities.score）
function getVerifiedScores(p: UserProfile): Record<string, number> {
  if (p.v3_score_data?.verified_scores) {
    return p.v3_score_data.verified_scores;
  }
  const out: Record<string, number> = {};
  HARD_SKILL_KEYS.forEach((k) => {
    const ab = p.abilities?.[k];
    if (ab && ab.verification_status !== "untested") {
      out[k] = ab.score;
    }
  });
  return out;
}

// 能力矩阵表格单元格颜色
function matrixCellClass(score: number | undefined): string {
  if (score === undefined || score === 0) return "bg-fox-gray-bg text-fox-gray";
  if (score >= 8) return "bg-fox-orange text-white";
  if (score >= 6) return "bg-fox-orange-light/60 text-fox-navy";
  if (score >= 4) return "bg-fox-cream text-fox-navy";
  return "bg-fox-gray-bg text-fox-gray";
}

// 优势等级：王牌能力 avg>=7 / 核心优势 avg>=5.5
function advantageLevel(avg: number): string {
  if (avg >= 7) return "王牌能力";
  if (avg >= 5.5) return "核心优势";
  return "潜力项";
}

// 取成员的 12型标签（从 v3_type.primary_type）
function getTwelveTypeLabel(p: UserProfile): string | null {
  return p.v3_type?.primary_type || null;
}

// 取成员的 12型图标（按类型名映射 lucide；库里存的 emoji 仅作数据兼容）
function getTwelveTypeIcon(p: UserProfile) {
  return (
    (p.v3_type?.primary_type && twelveTypeIcons[p.v3_type.primary_type]) ||
    HelpCircle
  );
}

// 维度图标（hardSkillMeta 里的 lucide 组件）
function DimIcon({ dimKey, className }: { dimKey: string; className?: string }) {
  const meta = hardSkillMeta.find((d) => d.key === dimKey);
  if (!meta) return null;
  return <meta.icon className={className} />;
}

// 状态徽章配置
const statusBadgeConfig: Record<
  "completed" | "in_progress" | "not_started",
  { label: string; className: string }
> = {
  completed: {
    label: "已完成",
    className: "bg-fox-mint/15 text-fox-mint-dark border-fox-mint/30",
  },
  in_progress: {
    label: "测评中",
    className: "bg-fox-orange/15 text-fox-orange-dark border-fox-orange/30",
  },
  not_started: {
    label: "未开始",
    className: "bg-fox-gray-bg text-fox-gray border-fox-gray-light",
  },
};

// 可信度等级徽章颜色
function credibilityBadgeClass(level: string | undefined): string {
  if (!level || level === "未评估") return "bg-fox-gray-bg text-fox-gray";
  switch (level) {
    case "S":
      return "bg-fox-orange text-white";
    case "A":
      return "bg-fox-orange-light/60 text-fox-navy";
    case "B":
      return "bg-fox-cream text-fox-navy";
    case "C":
      return "bg-fox-gray-bg text-fox-gray";
    case "D":
      return "bg-fox-gray-bg text-fox-gray";
    default:
      return "bg-fox-gray-bg text-fox-gray";
  }
}

// 饼图配色（12色，以 fox-orange 为主色调）
const PIE_COLORS = [
  "#f2aa72",
  "#ff9f4d",
  "#ffb87a",
  "#6bcb9f",
  "#4ea882",
  "#2b4c7e",
  "#3d6298",
  "#ff6b6b",
  "#ffd93d",
  "#c9a821",
  "#8b8b8b",
  "#e5e5e5",
];

export default function TeamDashboardPage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const teams = useStore((state) => state.teams);
  const profiles = useStore((state) => state.profiles);
  const loadTeam = useStore((state) => state.loadTeam);
  const updateMemberPosition = useStore((state) => state.updateMemberPosition);
  const removeMember = useStore((state) => state.removeMember);
  const storeCurrentUserRole = useStore((state) => state.currentUserRole);

  const [showRealNames, setShowRealNames] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [shared, setShared] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // 移除成员确认 Dialog
  const [removeTarget, setRemoveTarget] = useState<UserProfile | null>(null);
  const [removing, setRemoving] = useState(false);
  // 职位编辑状态：记录正在编辑哪个成员
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [savingPosition, setSavingPosition] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingTeam(true);
    loadTeam(params.teamId).finally(() => {
      if (!cancelled) setLoadingTeam(false);
    });
    return () => {
      cancelled = true;
    };
  }, [params.teamId, loadTeam]);

  const realTeam = teams.find((item) => item.team_id === params.teamId);
  const team = loadingTeam ? null : realTeam ?? null;
  // 真实数据优先；未加载完或无真实团队时用空数组，不回退 mock 避免显示假数据
  const teamProfiles = !loadingTeam && realTeam
    ? profiles.filter((p) => p.team_id === params.teamId)
    : !loadingTeam
    ? []
    : [];

  useEffect(() => {
    if (team?.team_name) {
      document.title = `${team.team_name} - 团队看板 - Foxity`;
    }
    return () => {
      document.title = "Foxity";
    };
  }, [team?.team_name]);

  // 权限模型：队长看完整数据，队员看受限数据
  // 注意：mock 兜底数据下 currentUserRole 为 null，此时按队长视角展示（便于本地预览）
  const isLeader = storeCurrentUserRole !== "member";

  // 从 team.members 中读取 role/position 的映射（member 对象上有这两个字段，UserProfile 类型没有）
  const memberMetaMap = useMemo(() => {
    const map: Record<string, { role: string; position: string }> = {};
    if (team?.members) {
      team.members.forEach((m: any) => {
        if (m.user_id) {
          map[m.user_id] = {
            role: m.role || "member",
            position: m.position || "",
          };
        }
      });
    }
    return map;
  }, [team]);

  const displayProfiles: UserProfile[] = teamProfiles.map((p, idx) => ({
    ...p,
    user_name: showRealNames ? p.user_name : `成员${idx + 1}`,
  }));

  // 计算团队分析数据
  const teamAnalysis = useMemo(() => {
    if (displayProfiles.length === 0) return null;
    return analyzeTeam(displayProfiles);
  }, [displayProfiles]);

  // 模块一：12型角色分布饼图（放在 early return 之前以满足 Rules of Hooks）
  const twelveTypeData = useMemo(() => {
    if (!teamAnalysis) return [];
    return Object.entries(teamAnalysis.twelveTypeDistribution).map(
      ([key, val]) => ({
        name: val.name,
        value: val.count,
        key,
      })
    );
  }, [teamAnalysis]);

  const completedCount = displayProfiles.filter((p) =>
    isAssessmentCompleted(p)
  ).length;

  const inviteLink = `${mounted ? window.location.origin : ""}/team/${params.teamId}/join`;

  // 分享功能：复制本页链接
  const handleShare = async () => {
    const pageLink = `${mounted ? window.location.origin : ""}/team/${params.teamId}`;
    try {
      await navigator.clipboard.writeText(pageLink);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      // 忽略
    }
  };

  // 删除/退出团队
  const handleDeleteTeam = async () => {
    if (deleting) return;
    setDeleting(true);
    // 先关闭 dialog、跳回控制台，再清理 store 状态
    // 避免删除成功后本页因 team 变 null 短暂渲染 fallback UI 造成"黑屏"
    setShowDeleteDialog(false);
    try {
      const res = await fetch(`/api/teams/${params.teamId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setDeleting(false);
        alert("删除失败，请检查网络或稍后重试");
        return;
      }
      router.replace("/dashboard");
      // 路由跳转后，异步清理 store（组件此时已卸载，不会再触发本页重渲染）
      const data = await res.json().catch(() => ({}));
      const state = useStore.getState();
      useStore.setState({
        teams: state.teams.filter((t) => t.team_id !== params.teamId),
        profiles: state.profiles.filter((p) => p.team_id !== params.teamId),
        currentTeam: state.currentTeam?.team_id === params.teamId ? null : state.currentTeam,
        currentUserRole: state.currentTeam?.team_id === params.teamId ? null : state.currentUserRole,
      });
      // 未使用变量占位，避免 lint 警告
      void data;
    } catch (e) {
      console.error("delete team error:", e);
      setDeleting(false);
      alert("删除失败，请检查网络或稍后重试");
    }
  };

  // 编辑职位
  const handlePositionChange = async (userId: string, position: string) => {
    setSavingPosition(true);
    await updateMemberPosition(params.teamId, userId, position);
    setSavingPosition(false);
    setEditingPositionId(null);
  };

  // 移除成员
  const handleRemoveMember = async () => {
    if (!removeTarget || removing) return;
    setRemoving(true);
    const ok = await removeMember(params.teamId, removeTarget.user_id);
    setRemoving(false);
    setRemoveTarget(null);
    if (!ok) {
      alert("移除成员失败，请稍后重试");
    }
  };

  // 跳转成员详情
  const goToMemberDetail = (userId: string) => {
    router.push(`/team/${params.teamId}/member/${userId}`);
  };

  // 跳转自己的画像
  const goToOwnProfile = () => {
    router.push(`/profile/${params.teamId}`);
  };

  if (loadingTeam) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fox-cream/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-fox-orange" />
          <p className="text-sm text-fox-gray">加载团队数据...</p>
        </div>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fox-cream/30">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-fox-gray">未找到该团队或加载失败</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
            返回工作台
          </Button>
        </div>
      </main>
    );
  }

  // ===== Tab 1：能力矩阵 / 亮点墙 =====

  // 队长视角：能力矩阵表格
  const renderLeaderMatrix = () => {
    if (displayProfiles.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-fox-gray-light bg-white p-10 text-center">
          <p className="text-sm text-fox-gray">
            暂无成员完成测评，邀请队友来看看能力矩阵吧。
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-fox-navy">团队能力矩阵</h2>
            <p className="text-sm text-fox-gray">数字为验证分，颜色越深代表能力越强</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRealNames(!showRealNames)}
            className="text-fox-gray"
          >
            {showRealNames ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showRealNames ? "匿名显示" : "显示真名"}
          </Button>
        </div>

        <div className="fox-card overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[480px] sm:min-w-[640px]">
              {/* 表头 */}
              <div className="grid grid-cols-[100px_repeat(5,minmax(80px,1fr))_100px] bg-fox-navy text-xs font-semibold text-white sm:grid-cols-[140px_repeat(5,minmax(90px,1fr))_120px] sm:text-sm">
                <div className="p-2 text-center sm:p-3">队员</div>
                {hardSkillMeta.map((dim) => (
                  <div key={dim.key} className="p-2 text-center sm:p-3">
                    <dim.icon className="mr-1 inline h-3.5 w-3.5 align-[-2px] sm:h-4 sm:w-4" /> {dim.shortName}
                  </div>
                ))}
                <div className="p-2 text-center sm:p-3">可信度</div>
              </div>

              {/* 成员行 */}
              {displayProfiles.map((profile) => {
                const vs = getVerifiedScores(profile);
                const credibilityLevel = profile.v3_credibility?.overall_level;
                return (
                  <div
                    key={profile.user_id}
                    className="grid grid-cols-[100px_repeat(5,minmax(80px,1fr))_100px] cursor-pointer border-t border-fox-gray-light text-xs hover:bg-fox-cream/50 sm:grid-cols-[140px_repeat(5,minmax(90px,1fr))_120px] sm:text-sm"
                    onClick={() => goToMemberDetail(profile.user_id)}
                  >
                    <div className="flex items-center gap-1.5 p-2 font-medium text-fox-navy sm:gap-2 sm:p-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fox-cream text-xs font-bold text-fox-orange sm:h-7 sm:w-7">
                        {profile.user_name[0]}
                      </div>
                      <span className="truncate">{profile.user_name}</span>
                    </div>
                    {hardSkillMeta.map((dim) => {
                      const score = vs[dim.key];
                      return (
                        <div
                          key={dim.key}
                          className={cn(
                            "p-2 text-center font-semibold tabular-nums sm:p-3",
                            matrixCellClass(score)
                          )}
                        >
                          {score ? score.toFixed(1) : "—"}
                        </div>
                      );
                    })}
                    <div className="p-2 text-center sm:p-3">
                      {credibilityLevel ? (
                        <span
                          className={cn(
                            "inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
                            credibilityBadgeClass(credibilityLevel)
                          )}
                        >
                          {credibilityLevel}
                        </span>
                      ) : (
                        <span className="text-fox-gray">—</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 团队均分行 */}
              <div className="grid grid-cols-[100px_repeat(5,minmax(80px,1fr))_100px] border-t border-fox-gray-light bg-fox-gray-bg text-xs font-semibold text-fox-navy sm:grid-cols-[140px_repeat(5,minmax(90px,1fr))_120px] sm:text-sm">
                <div className="p-2 text-center sm:p-3">团队均分</div>
                {hardSkillMeta.map((dim) => {
                  const avg = teamAnalysis?.dimensionAverages[dim.key] || 0;
                  return (
                    <div key={dim.key} className="p-2 text-center tabular-nums sm:p-3">
                      {avg ? avg.toFixed(1) : "—"}
                    </div>
                  );
                })}
                <div className="p-2 text-center text-fox-gray sm:p-3">—</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 队员视角：亮点墙
  const renderMemberHighlightWall = () => {
    if (displayProfiles.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-fox-gray-light bg-white p-10 text-center">
          <p className="text-sm text-fox-gray">暂无成员，邀请队友来加入团队吧。</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-fox-navy">团队亮点墙</h2>
          <p className="text-sm text-fox-gray">看看每位队友最厉害的地方</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayProfiles.map((profile) => {
            const highlight = teamAnalysis?.memberHighlights[profile.user_id];
            const isOwn = profile.user_id === useStore.getState().currentUserId;
            const memberRole = memberMetaMap[profile.user_id]?.role || "member";
            const memberPosition = memberMetaMap[profile.user_id]?.position || "";
            return (
              <Card
                key={profile.user_id}
                className={cn(
                  "py-0 transition-all hover:shadow-md",
                  isOwn && "cursor-pointer border-fox-orange/40"
                )}
                onClick={() => {
                  if (isOwn) goToOwnProfile();
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fox-cream text-lg font-bold text-fox-orange">
                      {profile.user_name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-fox-navy">
                          {profile.user_name}
                        </h3>
                        {memberRole === "leader" && (
                          <Badge className="bg-fox-orange/15 text-fox-orange-dark">队长</Badge>
                        )}
                      </div>
                      {memberPosition && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {memberPosition}
                        </Badge>
                      )}
                    </div>
                    {isOwn && (
                      <Badge variant="outline" className="border-fox-orange/40 text-fox-orange-dark">
                        我
                      </Badge>
                    )}
                  </div>

                  {highlight ? (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between rounded-lg bg-fox-cream/60 px-3 py-2">
                        <div>
                          <p className="text-xs text-fox-gray">最强能力</p>
                          <p className="text-sm font-semibold text-fox-navy">
                            {highlight.topDimension}
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            "border-transparent",
                            highlight.level === "精通"
                              ? "bg-fox-orange text-white"
                              : highlight.level === "熟练"
                              ? "bg-fox-orange-light/60 text-fox-navy"
                              : highlight.level === "掌握"
                              ? "bg-fox-cream text-fox-navy"
                              : "bg-fox-gray-bg text-fox-gray"
                          )}
                        >
                          {highlight.level}
                        </Badge>
                      </div>
                      <p className="text-xs text-fox-gray">{highlight.description}</p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg bg-fox-gray-bg px-3 py-3 text-center">
                      <p className="text-xs text-fox-gray">该成员尚未完成测评</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // ===== Tab 2：分布分析 =====

  const renderTwelveTypePie = () => {
    if (twelveTypeData.length === 0) {
      return (
        <p className="py-6 text-center text-sm text-fox-gray">
          等待队员完成测评后生成 12 型分布
        </p>
      );
    }
    return (
      <div className="flex flex-col items-center gap-4 md:flex-row">
        <div className="h-48 w-full sm:h-64 md:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={twelveTypeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={40}
                label={(entry: any) => `${entry.value}人`}
                labelLine={false}
              >
                {twelveTypeData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value: any, name: any) => [`${value} 人`, name]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e5e5",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {twelveTypeData.map((item, idx) => {
            const TypeIcon = twelveTypeIcons[item.name] || HelpCircle;
            return (
              <div key={item.key} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                <TypeIcon className="h-3.5 w-3.5 text-fox-navy" />
                <span className="flex-1 text-fox-navy">{item.name}</span>
                <span className="font-semibold text-fox-gray">{item.value}人</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 模块二：团队优势（前2个最高维度）
  const renderTeamAdvantages = () => {
    const strongest = teamAnalysis?.strongestDimensions || [];
    if (strongest.length === 0) {
      return (
        <p className="py-6 text-center text-sm text-fox-gray">
          等待队员完成测评后生成团队优势分析
        </p>
      );
    }
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {strongest.map((dim) => (
          <div
            key={dim.dimensionKey}
            className="rounded-xl border border-fox-orange/20 bg-fox-cream/40 p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-fox-navy">
                <DimIcon dimKey={dim.dimensionKey} className="mr-1 inline h-4 w-4 align-[-2px]" /> {dim.dimension}
              </h4>
              <Badge
                className={cn(
                  "border-transparent",
                  dim.avg >= 7
                    ? "bg-fox-orange text-white"
                    : "bg-fox-orange-light/60 text-fox-navy"
                )}
              >
                {advantageLevel(dim.avg)}
              </Badge>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-fox-navy">{dim.avg.toFixed(1)}</span>
              <span className="text-xs text-fox-gray">团队均分</span>
            </div>
            {dim.topMembers.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-fox-gray">代表成员</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {dim.topMembers.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 模块三：团队短板（队长专属）
  const renderTeamWeakness = () => {
    if (!isLeader) return null;
    const weakest = teamAnalysis?.weakestDimensions || [];
    if (weakest.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">团队短板</CardTitle>
            <CardDescription>团队平均分最低的维度（仅队长可见）</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="py-6 text-center text-sm text-fox-gray">
              {teamAnalysis && teamAnalysis.completedCount > 0
                ? "暂无明显短板"
                : "等待队员完成测评后生成短板分析"}
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-fox-orange" />
            团队短板
          </CardTitle>
          <CardDescription>团队平均分最低的维度（仅队长可见）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {weakest.map((dim) => (
              <div
                key={dim.dimensionKey}
                className="rounded-xl border border-fox-gray-light bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-fox-navy">
                    <DimIcon dimKey={dim.dimensionKey} className="mr-1 inline h-4 w-4 align-[-2px]" /> {dim.dimension}
                  </h4>
                  <Badge className="border-transparent bg-fox-coral/15 text-fox-coral">
                    待加强
                  </Badge>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-fox-navy">{dim.avg.toFixed(1)}</span>
                  <span className="text-xs text-fox-gray">团队均分</span>
                </div>
                {dim.topMember ? (
                  <div className="mt-3 rounded-lg bg-fox-cream/50 px-3 py-2">
                    <p className="text-xs text-fox-gray">队内最强</p>
                    <p className="text-sm font-medium text-fox-navy">
                      {dim.topMember}
                      <span className="ml-2 text-xs text-fox-gray">
                        {dim.topMemberScore.toFixed(1)} 分
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-fox-gray">暂无数据</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ===== Tab 3：成员列表 =====

  // 成员的状态徽章
  const renderStatusBadge = (profile: UserProfile) => {
    const status = getMemberStatus(profile);
    const cfg = statusBadgeConfig[status];
    return (
      <Badge variant="outline" className={cn("text-xs", cfg.className)}>
        {cfg.label}
      </Badge>
    );
  };

  // 取成员的综合分（验证分均值）
  function getOverallScore(p: UserProfile): number | null {
    const vs = getVerifiedScores(p);
    const vals = Object.values(vs).filter((v) => v > 0);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  // 取成员的最强能力（不显示分数，只显示维度名）
  function getTopAbilityLabel(p: UserProfile): string | null {
    const highlight = teamAnalysis?.memberHighlights[p.user_id];
    if (highlight) return highlight.topDimension;
    const vs = getVerifiedScores(p);
    const entries = Object.entries(vs).filter(([, v]) => v > 0);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return hardSkillLabels[entries[0][0] as HardSkillKey] || null;
  }

  // 队长视角成员卡片
  const renderLeaderMemberCard = (profile: UserProfile) => {
    const memberRole = memberMetaMap[profile.user_id]?.role || "member";
    const memberPosition = memberMetaMap[profile.user_id]?.position || "";
    const overall = getOverallScore(profile);
    const credibilityLevel = profile.v3_credibility?.overall_level;
    const twelveType = getTwelveTypeLabel(profile);
    const isEditing = editingPositionId === profile.user_id;
    const isSelf = profile.user_id === useStore.getState().currentUserId;

    return (
      <Card key={profile.user_id} className="gap-0 py-0 transition-all hover:shadow-md">
        <CardContent className="p-4">
          {/* 头部：头像+姓名+角色标签 */}
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fox-cream text-lg font-bold text-fox-orange">
              {profile.user_name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold text-fox-navy">{profile.user_name}</h3>
                {memberRole === "leader" ? (
                  <Badge className="bg-fox-orange text-white">队长</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    成员
                  </Badge>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                {renderStatusBadge(profile)}
              </div>
            </div>
          </div>

          {/* 职位标签（可点击编辑） */}
          <div className="mt-3">
            <p className="mb-1 text-xs text-fox-gray">职位</p>
            {isEditing ? (
              <Select
                value={memberPosition || ""}
                onValueChange={(v) => handlePositionChange(profile.user_id, v)}
                disabled={savingPosition}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="选择职位" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos} className="text-xs">
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-full border border-fox-gray-light bg-white px-3 py-1.5 text-left text-xs hover:border-fox-orange/40"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingPositionId(profile.user_id);
                }}
              >
                <span className={cn(memberPosition ? "text-fox-navy" : "text-fox-gray")}>
                  {memberPosition || "未设置（点击编辑）"}
                </span>
                <Pencil className="h-3 w-3 text-fox-gray" />
              </button>
            )}
          </div>

          {/* 综合分 + 可信度 */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-fox-cream/50 px-3 py-2">
              <p className="text-xs text-fox-gray">综合分</p>
              <p className="text-lg font-bold text-fox-navy">
                {overall !== null ? overall.toFixed(1) : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-fox-cream/50 px-3 py-2">
              <p className="text-xs text-fox-gray">可信度</p>
              <div className="mt-0.5">
                {credibilityLevel ? (
                  <span
                    className={cn(
                      "inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
                      credibilityBadgeClass(credibilityLevel)
                    )}
                  >
                    {credibilityLevel}
                  </span>
                ) : (
                  <span className="text-sm text-fox-gray">—</span>
                )}
              </div>
            </div>
          </div>

          {/* 12型小标签 */}
          {twelveType && (
            <div className="mt-3">
              <Badge variant="outline" className="text-xs">
                {(() => {
                  const TypeIcon = getTwelveTypeIcon(profile);
                  return <TypeIcon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />;
                })()}
                {twelveType}
              </Badge>
            </div>
          )}

          {/* 操作 */}
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                goToMemberDetail(profile.user_id);
              }}
            >
              <Eye className="mr-1 h-3 w-3" />
              查看详情
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setEditingPositionId(
                  editingPositionId === profile.user_id ? null : profile.user_id
                );
              }}
            >
              <Pencil className="mr-1 h-3 w-3" />
              编辑职位
            </Button>
            {!isSelf && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-fox-coral hover:bg-fox-coral/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setRemoveTarget(profile);
                }}
              >
                <UserMinus className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // 队员视角成员卡片
  const renderMemberMemberCard = (profile: UserProfile) => {
    const memberRole = memberMetaMap[profile.user_id]?.role || "member";
    const memberPosition = memberMetaMap[profile.user_id]?.position || "";
    const topAbility = getTopAbilityLabel(profile);
    const twelveType = getTwelveTypeLabel(profile);

    return (
      <Card key={profile.user_id} className="gap-0 py-0 transition-all hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fox-cream text-lg font-bold text-fox-orange">
              {profile.user_name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold text-fox-navy">{profile.user_name}</h3>
                {memberRole === "leader" ? (
                  <Badge className="bg-fox-orange text-white">队长</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    成员
                  </Badge>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                {renderStatusBadge(profile)}
              </div>
            </div>
          </div>

          {/* 职位标签（只读） */}
          <div className="mt-3">
            <p className="mb-1 text-xs text-fox-gray">职位</p>
            <div className="rounded-lg border border-fox-gray-light bg-white px-3 py-1.5 text-xs">
              <span className={cn(memberPosition ? "text-fox-navy" : "text-fox-gray")}>
                {memberPosition || "未设置"}
              </span>
            </div>
          </div>

          {/* 最强能力亮点（不显示分数） */}
          <div className="mt-3 rounded-lg bg-fox-cream/50 px-3 py-2">
            <p className="text-xs text-fox-gray">最强能力</p>
            <p className="text-sm font-semibold text-fox-navy">
              {topAbility || "尚未完成测评"}
            </p>
          </div>

          {/* 12型小标签 */}
          {twelveType && (
            <div className="mt-3">
              <Badge variant="outline" className="text-xs">
                {(() => {
                  const TypeIcon = getTwelveTypeIcon(profile);
                  return <TypeIcon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />;
                })()}
                {twelveType}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <main className="min-h-screen bg-fox-cream/30 pb-12">
      <header className="border-b border-fox-gray-light bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">返回</span>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              {shared ? (
                <>
                  <Check className="mr-1 h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">已复制</span>
                </>
              ) : (
                <>
                  <Share2 className="mr-1 h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">分享看板</span>
                </>
              )}
            </Button>
            {isLeader && (
              <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="mr-1 h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">删除团队</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 删除团队 Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除团队</DialogTitle>
            <DialogDescription>
              确定要删除团队「{team.team_name}」吗？该操作会清除所有成员画像和聊天记录，且无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteTeam} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移除成员 Dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移除成员</DialogTitle>
            <DialogDescription>
              确定要移除「{removeTarget?.user_name}」吗？该成员的画像和聊天记录将被清除，且无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRemoveTarget(null)} disabled={removing}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={removing}>
              {removing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  移除中...
                </>
              ) : (
                "确认移除"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        {/* 团队标题区 */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-xl font-bold text-fox-navy md:text-3xl">
                {team.team_emoji && <span className="mr-2">{team.team_emoji}</span>}
                {team.team_name}
              </h1>
              <p className="mt-1 text-sm text-fox-gray">
                团队码：<span className="font-mono font-bold text-fox-navy">{team.team_id}</span>
              </p>
            </div>

            <div className="flex w-full items-center gap-4 rounded-2xl border border-fox-gray-light bg-white p-4 md:w-auto">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fox-cream text-fox-orange">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-fox-navy">{completedCount}</span>
                  <span className="text-sm text-fox-gray">/ {teamProfiles.length} 人已完成</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fox-gray-bg">
                  <div
                    className="h-full rounded-full bg-fox-orange transition-all duration-500"
                    style={{
                      width: `${teamProfiles.length > 0 ? (completedCount / teamProfiles.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 邀请链接卡片 */}
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-fox-gray-light bg-white p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-fox-navy">邀请链接</p>
              <p className="text-xs text-fox-gray">分享链接，邀请团队成员完成测评</p>
            </div>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-fox-gray-bg px-3 py-2 text-sm font-mono md:w-auto">
                {inviteLink}
              </div>
              <CopyButton value={inviteLink} label="" size="icon" />
            </div>
          </div>
        </div>

        <Tabs defaultValue="matrix" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-3 md:mb-6">
            <TabsTrigger value="matrix" className="text-xs sm:text-sm">
              {isLeader ? "能力矩阵" : "亮点墙"}
            </TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs sm:text-sm">分布分析</TabsTrigger>
            <TabsTrigger value="members" className="text-xs sm:text-sm">成员列表</TabsTrigger>
          </TabsList>

          {/* Tab 1：能力矩阵 / 亮点墙 */}
          <TabsContent value="matrix" className="space-y-4">
            {isLeader ? renderLeaderMatrix() : renderMemberHighlightWall()}
          </TabsContent>

          {/* Tab 2：分布分析 */}
          <TabsContent value="distribution" className="space-y-4 md:space-y-6">
            {/* 模块一：12型角色分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">12 型角色分布</CardTitle>
                <CardDescription>团队成员的 12 型组合角色分布</CardDescription>
              </CardHeader>
              <CardContent>
                {renderTwelveTypePie()}
                {twelveTypeData.length > 0 && (
                  <p className="mt-4 text-center text-xs text-fox-gray">
                    {teamAnalysis && teamAnalysis.completedCount > 0
                      ? `已完成测评 ${teamAnalysis.completedCount} 人，团队角色多样性${
                          twelveTypeData.length >= 4 ? "丰富" : twelveTypeData.length >= 2 ? "适中" : "较集中"
                        }。`
                      : "等待队员完成测评后生成解读。"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 模块二：团队优势 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">团队优势</CardTitle>
                <CardDescription>团队平均分最高的维度</CardDescription>
              </CardHeader>
              <CardContent>{renderTeamAdvantages()}</CardContent>
            </Card>

            {/* 模块三：团队短板（队长专属） */}
            {renderTeamWeakness()}
          </TabsContent>

          {/* Tab 3：成员列表 */}
          <TabsContent value="members" className="space-y-2">
            <h2 className="text-base font-bold text-fox-navy md:text-lg">成员列表</h2>
            {displayProfiles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-fox-gray-light bg-white p-10 text-center">
                <p className="text-sm text-fox-gray">
                  暂无成员，分享邀请链接来邀请队友加入吧。
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {displayProfiles.map((profile) =>
                  isLeader
                    ? renderLeaderMemberCard(profile)
                    : renderMemberMemberCard(profile)
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
