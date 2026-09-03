"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, Brain, MessageSquareQuote, Target, ChevronDown, Loader2, ScrollText, Activity, Clock, MessageCircle, TrendingUp, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AbilityRadar } from "@/components/AbilityRadar";
import { useStore } from "@/store/useStore";
import { hardSkillLabels, softSkillLabels, type LeaderSummary, type LeaderSkillAssessment, type ChatMessage as ChatMessageType, type UserProfile } from "@/types";
import { cn } from "@/lib/utils";
import { sanitizeFoxReply } from "@/lib/fox-markup";

const statusConfig = {
  verified: { label: "已验证", Icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  unverified: { label: "待验证", Icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
  untested: { label: "未涉及", Icon: HelpCircle, color: "text-gray-500 bg-gray-100" },
};

export default function MemberSummaryPage() {
  const params = useParams<{ teamId: string; userId: string }>();
  const router = useRouter();
  const profiles = useStore((state) => state.profiles);

  const [leaderSummary, setLeaderSummary] = useState<LeaderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChatHistory, setShowChatHistory] = useState(false);

  const profileFromStore = useMemo(() => {
    return profiles.find((p) => p.user_id === params.userId && p.team_id === params.teamId) ?? null;
  }, [profiles, params.userId, params.teamId]);

  // store 里没有时，从 API 兜底拉一份（例如直接刷新本页 / 从外部链接进入）
  const [fallbackProfile, setFallbackProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  useEffect(() => {
    if (profileFromStore) {
      setProfileLoaded(true);
      return;
    }
    let cancelled = false;
    setProfileLoaded(false);
    fetch(`/api/profiles/${params.userId}?team_id=${params.teamId}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (cancelled || !result) return;
        setFallbackProfile({
          user_id: result.user_id,
          user_name: result.user_name,
          team_id: result.team_id,
          timestamp: result.timestamp,
          ...(result.data || {}),
        } as UserProfile);
      })
      .catch((e) => console.warn("[member-detail] fallback profile fetch failed:", e))
      .finally(() => {
        if (!cancelled) setProfileLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [profileFromStore, params.userId, params.teamId]);

  const profile = profileFromStore ?? fallbackProfile;

  const [chatHistory, setChatHistory] = useState<ChatMessageType[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const url = `/api/chat-history/${params.userId}?team_id=${params.teamId}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setChatHistory(
            (data as any[]).map((m) => ({
              role: m.role,
              content: sanitizeFoxReply(m.content || ""),
              emotion: m.emotion,
              timestamp: m.created_at,
            }))
          );
        } else {
          console.warn("[member-detail] chat-history response not ok:", res.status, await res.text());
        }
      } catch (e) {
        console.error("load chat history error:", e);
      } finally {
        setHistoryLoaded(true);
      }
    };
    loadChatHistory();
  }, [params.userId, params.teamId]);

  useEffect(() => {
    const generateSummary = async () => {
      // 等聊天记录和画像都就绪后再判断
      if (!historyLoaded || !profileLoaded) return;
      if (!profile || chatHistory.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: chatHistory,
            user_name: profile.user_name,
            viewer_role: "leader",
          }),
        });

        if (!res.ok) throw new Error("生成失败");

        const data = await res.json();
        if (data.leader_summary) {
          setLeaderSummary(data.leader_summary);
        } else {
          setError("AI 未能生成评估，请稍后重试");
        }
      } catch (e: any) {
        setError(e?.message || "生成失败");
      } finally {
        setLoading(false);
      }
    };

    generateSummary();
  }, [profile, profileLoaded, chatHistory, historyLoaded]);

  // 对话统计数据（必须在所有提前 return 之前调用，遵守 Rules of Hooks）
  const chatStats = useMemo(() => {
    if (chatHistory.length === 0) return null;
    const userMsgs = chatHistory.filter((m) => m.role === "user");
    const foxMsgs = chatHistory.filter((m) => m.role === "fox" || m.role === "ai");
    const totalChars = chatHistory.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    const userChars = userMsgs.reduce((sum, m) => sum + (m.content?.length || 0), 0);

    // 计算对话时长（首条到末条）
    let durationMin = 0;
    if (chatHistory.length >= 2) {
      const first = chatHistory[0].timestamp;
      const last = chatHistory[chatHistory.length - 1].timestamp;
      if (typeof first === "number" && typeof last === "number") {
        durationMin = Math.round((last - first) / 60000);
      } else if (typeof first === "string" && typeof last === "string") {
        durationMin = Math.round((new Date(last).getTime() - new Date(first).getTime()) / 60000);
      }
    }

    return {
      total: chatHistory.length,
      userCount: userMsgs.length,
      foxCount: foxMsgs.length,
      totalChars,
      userChars,
      avgUserChars: userMsgs.length > 0 ? Math.round(userChars / userMsgs.length) : 0,
      durationMin,
    };
  }, [chatHistory]);

  // 雷达图数据
  const radarData = useMemo(() => {
    if (!leaderSummary) return [];
    return leaderSummary.hard_skills.map((s) => ({
      ability: s.dimension,
      label: hardSkillLabels[s.dimension as keyof typeof hardSkillLabels] || s.dimension,
      score: s.score,
      verified: s.status,
    }));
  }, [leaderSummary]);

  // 画像兜底请求还在飞行中：显示加载态而不是「未找到」
  if (!profileLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf7ef]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-fox-orange" />
          <p className="text-sm text-fox-gray">加载中...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-fox-gray">未找到该成员</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf7ef] pb-12">
      <header className="sticky top-0 z-30 border-b border-fox-gray-light bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/team/${params.teamId}`)}>
            <ArrowLeft className="mr-1 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">返回团队看板</span>
            <span className="sm:hidden">返回</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        {/* 成员头部 */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl font-bold text-fox-navy md:text-3xl">{profile.user_name}</h1>
        </motion.div>

        {loading && (
          <div className="mt-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-fox-orange" />
            <p className="text-sm text-fox-gray">Foxity 正在分析该成员的对话记录...</p>
          </div>
        )}

        {error && (
          <div className="mt-20 flex flex-col items-center justify-center gap-4">
            <p className="text-sm text-fox-coral">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>重试</Button>
          </div>
        )}

        {!loading && !leaderSummary && !error && (
          <div className="mt-20 flex flex-col items-center justify-center gap-4">
            <p className="text-sm text-fox-gray">该成员还没有对话记录，无法生成队长视角评估</p>
          </div>
        )}

        {leaderSummary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-6 space-y-4 md:mt-8 md:space-y-6"
          >
            {/* AI 可视化分析总览 */}
            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              {/* 能力雷达图 */}
              {radarData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-fox-orange" />
                      能力雷达图
                    </CardTitle>
                    <CardDescription>AI 分析的五大硬技能分布</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <div className="h-[300px] w-full max-w-[340px]">
                      <AbilityRadar data={radarData} fullWidth />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 对话统计 */}
              {chatStats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-fox-navy" />
                      对话数据统计
                    </CardTitle>
                    <CardDescription>基于完整对话记录的分析</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <StatBlock
                        icon={<MessageCircle className="h-4 w-4 text-fox-orange" />}
                        label="总消息数"
                        value={`${chatStats.total}`}
                        sub={`用户 ${chatStats.userCount} · Foxity ${chatStats.foxCount}`}
                      />
                      <StatBlock
                        icon={<Clock className="h-4 w-4 text-fox-mint" />}
                        label="对话时长"
                        value={chatStats.durationMin > 0 ? `${chatStats.durationMin} 分钟` : "—"}
                        sub="首条至末条"
                      />
                      <StatBlock
                        icon={<Activity className="h-4 w-4 text-fox-navy" />}
                        label="用户发言"
                        value={`${chatStats.userChars}`}
                        sub="总字数"
                      />
                      <StatBlock
                        icon={<TrendingUp className="h-4 w-4 text-fox-coral" />}
                        label="平均回复"
                        value={`${chatStats.avgUserChars}`}
                        sub="字/条"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 硬技能评估 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-fox-orange" />
                  硬技能评估
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {leaderSummary.hard_skills.map((skill, idx) => (
                  <SkillAssessmentItem key={idx} skill={skill} />
                ))}
              </CardContent>
            </Card>

            {/* 软实力评估 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-fox-mint" />
                  软实力评估
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {leaderSummary.soft_skills.map((skill, idx) => (
                  <SkillAssessmentItem key={idx} skill={skill} />
                ))}
              </CardContent>
            </Card>

            {/* 关键对话证据 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareQuote className="h-5 w-5 text-fox-navy" />
                  关键对话证据
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...leaderSummary.hard_skills, ...leaderSummary.soft_skills]
                  .filter((s) => s.key_quotes && s.key_quotes.length > 0)
                  .map((skill, idx) => {
                    const dimLabel = hardSkillLabels[skill.dimension as keyof typeof hardSkillLabels] ||
                      softSkillLabels[skill.dimension as keyof typeof softSkillLabels] ||
                      skill.dimension;
                    return skill.key_quotes.map((quote, qIdx) => (
                      <div key={`${idx}-${qIdx}`} className="rounded-xl border border-fox-gray-light bg-white p-4">
                        <p className="text-sm text-fox-navy">"{quote}"</p>
                        <p className="mt-2 text-xs text-fox-gray">→ {dimLabel} {skill.score > 0 ? `+${skill.score * 0.1}` : ""}</p>
                      </div>
                    ));
                  })}
                {leaderSummary.hard_skills.concat(leaderSummary.soft_skills).every((s) => !s.key_quotes || s.key_quotes.length === 0) && (
                  <p className="text-sm text-fox-gray">暂无关键对话证据</p>
                )}
              </CardContent>
            </Card>

            {/* 团队适配建议 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-fox-coral" />
                  团队适配建议
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-emerald-600">适合</p>
                  <div className="flex flex-wrap gap-2">
                    {leaderSummary.team_fit.suitable.map((item, idx) => (
                      <Badge key={idx} className="bg-emerald-50 text-emerald-700">{item}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-fox-coral">不适合</p>
                  <div className="flex flex-wrap gap-2">
                    {leaderSummary.team_fit.not_suitable.map((item, idx) => (
                      <Badge key={idx} className="bg-fox-coral/10 text-fox-coral">{item}</Badge>
                    ))}
                  </div>
                </div>
                {leaderSummary.team_fit.notes && (
                  <div className="rounded-xl bg-fox-cream/50 p-4">
                    <p className="text-xs font-semibold text-fox-gray">注意事项</p>
                    <p className="mt-1 text-sm text-fox-navy">{leaderSummary.team_fit.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 完整对话记录 */}
            {chatHistory.length > 0 && (
              <Card>
                <button
                  className="flex w-full items-center justify-between px-6 py-0"
                  onClick={() => setShowChatHistory(!showChatHistory)}
                >
                  <CardTitle className="flex items-center gap-2">
                    <ScrollText className="h-5 w-5 text-fox-gray" />
                    查看完整对话记录
                  </CardTitle>
                  <ChevronDown className={cn("h-5 w-5 text-fox-gray transition-transform", showChatHistory && "rotate-180")} />
                </button>
                {showChatHistory && (
                  <CardContent>
                    <div className="max-h-[500px] space-y-3 overflow-y-auto">
                      {chatHistory.map((msg, idx) => (
                        <div key={idx} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                              msg.role === "user"
                                ? "bg-fox-navy text-white"
                                : "bg-fox-cream text-fox-navy"
                            )}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}

function SkillAssessmentItem({ skill }: { skill: LeaderSkillAssessment }) {
  const dimLabel = hardSkillLabels[skill.dimension as keyof typeof hardSkillLabels] ||
    softSkillLabels[skill.dimension as keyof typeof softSkillLabels] ||
    skill.dimension;
  const status = statusConfig[skill.status] || statusConfig.untested;

  return (
    <div className="rounded-xl border border-fox-gray-light bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-fox-navy">{dimLabel}</span>
          <span className="text-lg font-bold text-fox-navy">{skill.score}/10</span>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", status.color)}>
          <status.Icon className="h-3.5 w-3.5" /> {status.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-fox-navy">{skill.summary}</p>
      <p className="mt-1 text-xs text-fox-gray">证据：{skill.evidence}</p>
    </div>
  );
}

function StatBlock({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-fox-gray-light bg-fox-cream/30 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-fox-gray">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-xl font-bold text-fox-navy">{value}</p>
      <p className="mt-0.5 text-xs text-fox-gray">{sub}</p>
    </div>
  );
}
