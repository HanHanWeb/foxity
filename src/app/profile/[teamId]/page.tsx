"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Share2, Download, Sparkles, BarChart3, Heart, BookHeart, MessageCircle, Crown, GraduationCap, TrendingUp, Tags, Radar, GitCompare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AbilityRadar } from "@/components/AbilityRadar";
import { AbilityBarList } from "@/components/AbilityBarList";
import { ScoreComparison } from "@/components/ScoreComparison";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/lib/auth";
import { exportProfileToPDF } from "@/lib/export-pdf";
import type { HardSkillKey, SoftSkillKey, UserProfile } from "@/types";
import { hardSkillLabels, softSkillMeta } from "@/types";

// 软实力维度图标（去掉性格特质和做事风格后剩余的维度）
const softSkillIcons: Partial<Record<SoftSkillKey, typeof MessageCircle>> = {
  communication: MessageCircle,
  leadership: Crown,
  learning: GraduationCap,
};

// 成长建议优先级样式
const priorityStyle: Record<string, { bg: string; dot: string; text: string; label: string }> = {
  low: { bg: "bg-green-100", dot: "bg-green-500", text: "text-green-700", label: "低" },
  medium: { bg: "bg-yellow-100", dot: "bg-yellow-500", text: "text-yellow-700", label: "中" },
  high: { bg: "bg-red-100", dot: "bg-red-500", text: "text-red-700", label: "高" },
};

export default function ProfilePage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(false);
  const currentProfile = useStore((state) => state.currentProfile);
  const currentTeam = useStore((state) => state.currentTeam);
  const [teamName, setTeamName] = useState<string>("团队测评");
  const [teamEmoji, setTeamEmoji] = useState<string>("");
  const [dbProfile, setDbProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [exporting, setExporting] = useState(false);

  // 导出 PDF：从隐藏的完整渲染区生成
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const container = document.getElementById("export-container");
      if (!container) return;

      const sections: HTMLElement[] = [];
      const sectionEls = container.querySelectorAll<HTMLElement>("[data-export-section]");
      sectionEls.forEach((el) => sections.push(el));

      await exportProfileToPDF(sections, {
        userName: data?.user_name || "用户",
        teamName,
      });
    } catch (e) {
      console.error("Export PDF error:", e);
    } finally {
      setExporting(false);
    }
  };

  // 从数据库加载用户画像（按 team_id 隔离）
  useEffect(() => {
    if (authLoading) return;
    if (!user?.user_id) {
      // 未登录：清掉旧的 dbProfile，直接结束加载
      setDbProfile(null);
      setLoadingProfile(false);
      return;
    }
    let cancelled = false;
    setLoadingProfile(true);
    fetch(`/api/profiles/${user.user_id}?team_id=${params.teamId}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (cancelled) return;
        if (result?.data) {
          setDbProfile(result.data as UserProfile);
        } else {
          setDbProfile(null);
        }
      })
      .catch((e) => {
        console.error("[profile] fetch dbProfile error:", e);
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.user_id, params.teamId, authLoading]);

  // 加载当前团队名称
  useEffect(() => {
    if (currentTeam?.team_id === params.teamId) {
      setTeamName(currentTeam.team_name);
      setTeamEmoji(currentTeam.team_emoji || "");
    } else {
      fetch(`/api/teams/${params.teamId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((team) => {
          if (team?.team_name) setTeamName(team.team_name);
          if (team?.team_emoji) setTeamEmoji(team.team_emoji);
        })
        .catch(() => {});
    }
  }, [params.teamId, currentTeam]);

  // 优先用内存中的 currentProfile（刚测评完），否则用数据库加载的
  // 严禁使用 mock 虚假数据
  const rawData = currentProfile ?? dbProfile;
  const data = rawData ? { ...rawData, user_name: user?.name || rawData.user_name } : null;

  const radarData = data
    ? (Object.keys(data.abilities) as HardSkillKey[]).map((key) => ({
        ability: key,
        label: hardSkillLabels[key],
        score: data.abilities[key].score,
        verified: data.abilities[key].verification_status,
      }))
    : [];

  // 软实力数据：V2 soft_skills 优先，V3 soft_skills 兜底，显示全部 5 个维度
  const v2SoftSkills = data?.v2_assessment?.soft_skills || {};
  const v3SoftSkills = (data as any)?.v3_soft_skills || {};
  const allSoftSkillKeys: SoftSkillKey[] = ["communication", "leadership", "learning", "personality", "work_style"];
  const softSkillEntries = allSoftSkillKeys
    .map((key) => {
      const v2Val = (v2SoftSkills as any)[key];
      const v3Val = v3SoftSkills[key];
      if (v2Val && typeof v2Val.score === "number") {
        return [key, v2Val] as [string, any];
      }
      if (v3Val && typeof v3Val.score === "number" && v3Val.score > 0) {
        return [key, { score: v3Val.score, label: softSkillMeta.find((m) => m.key === key)?.name || key, insights: [], evidence: [] }] as [string, any];
      }
      return null;
    })
    .filter(Boolean) as [string, any][];

  // 成长建议按优先级排序（高→中→低）
  const sortedSuggestions = [...(data?.growth_suggestions || [])].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  // 关键能力标签按类别分组
  const keywordTags = data?.keyword_tags || [];
  const tagsByCategory = keywordTags.reduce<Record<string, typeof keywordTags>>((acc, tag) => {
    const cat = tag.category || "其他";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tag);
    return acc;
  }, {});

  // 主题色黄
  const themeYellow = "#f2aa72";

  // 没有数据时显示 loading（等待 auth + 内存 + 数据库加载）
  const showLoading = !data && (authLoading || loadingProfile);
  // 数据加载完成但没有画像数据
  const noData = !data && !authLoading && !loadingProfile;

  return (
    <main className="min-h-screen bg-fox-cream/30 pb-12">
      <header className="border-b border-fox-gray-light bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              分享
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || !data}>
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  导出
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {showLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-fox-navy" />
            <p className="text-sm text-fox-gray">加载画像数据...</p>
          </div>
        </div>
      ) : noData ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <img src="/fox.png" alt="Foxity" width={80} height={80} className="rounded-2xl opacity-60" />
            <div>
              <p className="text-lg font-semibold text-fox-navy">
                {user ? "还没有画像数据" : "请先登录后查看画像"}
              </p>
              <p className="mt-2 text-sm text-fox-gray">
                {user
                  ? "完成一次测评对话后，你的能力画像会显示在这里。"
                  : "登录后完成测评对话，你的能力画像会保存在你的账号里。"}
              </p>
            </div>
            {user ? (
              <Button onClick={() => router.push(`/chat/${params.teamId}`)} className="mt-2">
                开始测评
              </Button>
            ) : (
              <Button
                onClick={() =>
                  router.push(`/auth?redirect=/profile/${params.teamId}`)
                }
                className="mt-2"
              >
                去登录
              </Button>
            )}
          </div>
        </div>
      ) : data && (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div
          className="mb-8 flex flex-col items-center text-center md:flex-row md:items-start md:gap-6 md:text-left"
        >
          <div className="relative">
            <img src="/fox.png" alt={data.user_name} width={100} height={100} className="rounded-2xl" />
            <Badge
              variant="default"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs"
            >
              {data.core_positioning}
            </Badge>
          </div>
          <div className="mt-4 md:mt-0">
            <h1 className="text-2xl font-bold text-fox-navy md:text-3xl">{data.user_name}</h1>
            <p className="mt-1 text-sm text-fox-gray">{teamEmoji && <span className="mr-1">{teamEmoji}</span>}{teamName}</p>
            <p className="mt-2 max-w-2xl text-sm text-fox-navy/80">{data.overview_summary}</p>
          </div>
        </div>

        {/* 提醒：继续对话可提升准确性 */}
        {(currentProfile || dbProfile) && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-fox-orange/30 bg-fox-orange/8 px-4 py-3">
            <Sparkles className="h-4 w-4 flex-shrink-0 text-fox-orange" />
            <p className="text-sm text-fox-navy/80">
              画像已生成，但聊得越深，Foxity 看得越清——回到对话继续聊聊，可以提升评估的综合准确性。
            </p>
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="abilities">能力详解</TabsTrigger>
            <TabsTrigger value="behavior">软实力</TabsTrigger>
            <TabsTrigger value="growth">成长建议</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* V2 标签 */}
            {data.tags && data.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag, idx) => (
                  <Badge key={idx} className="text-sm" style={{ backgroundColor: "#f2aa72", color: "white" }}>{tag}</Badge>
                ))}
              </div>
            )}

            {/* V2 高亮 */}
            {data.highlights && data.highlights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-fox-orange" />
                    亮点
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-fox-navy">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fox-orange" />
                      {h}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radar className="h-5 w-5" style={{ color: themeYellow }} />
                    能力雷达图
                  </CardTitle>
                  <CardDescription>五大能力维度分布</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <AbilityRadar data={radarData} fullWidth />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitCompare className="h-5 w-5" style={{ color: themeYellow }} />
                    自评 vs 实测
                  </CardTitle>
                  <CardDescription>你的自我认知准确度</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScoreComparison profile={data} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5" style={{ color: themeYellow }} />
                  关键能力标签
                </CardTitle>
                <CardDescription>AI 从对话中提取的已验证技能关键词</CardDescription>
              </CardHeader>
              <CardContent>
                {keywordTags.length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(tagsByCategory).map(([category, tags], catIdx) => (
                      <div key={category}>
                        <h4 className="mb-2 text-sm font-semibold text-fox-navy">{category}</h4>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((item, idx) => (
                            <span
                              key={`${catIdx}-${idx}`}
                              className="cursor-default rounded-full px-3 py-1.5 text-sm font-medium"
                              style={{
                                backgroundColor: item.confidence === "high" ? themeYellow : item.confidence === "medium" ? themeYellow : `${themeYellow}80`,
                                color: item.confidence === "low" ? "#666" : "white",
                              }}
                              title={item.evidence}
                            >
                              {item.tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-fox-gray">对话中暂未提取到已验证的技能关键词</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="abilities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-fox-navy" />
                  各维度能力详解
                </CardTitle>
                <CardDescription>点击维度查看详细分析和洞察</CardDescription>
              </CardHeader>
              <CardContent>
                <AbilityBarList profile={data} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-6">
            {/* V2 软实力叙述 */}
            {data.soft_skill_narrative && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-fox-orange" />
                    软实力画像
                  </CardTitle>
                  <CardDescription>Foxity 的观察笔记</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-fox-navy">{data.soft_skill_narrative}</p>
                </CardContent>
              </Card>
            )}

            {/* 软实力维度分数 */}
            {softSkillEntries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookHeart className="h-5 w-5 text-fox-navy" />
                    软实力维度
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {softSkillEntries.map(([key, val], idx) => {
                    const meta = softSkillMeta.find((m) => m.key === key);
                    const label = meta?.name || val.label || key;
                    const Icon = softSkillIcons[key as SoftSkillKey];
                    return (
                      <div key={key}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-medium text-fox-navy">
                            {Icon && <Icon className="h-4 w-4 text-fox-navy" />}
                            {label}
                          </span>
                          <span className="font-semibold text-fox-navy">{val.score}/10</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-fox-gray-bg">
                          <div
                            className="h-full rounded-full bg-fox-mint"
                            style={{ width: `${val.score * 10}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* 软实力数据为空时提示 */}
            {!data.soft_skill_narrative && softSkillEntries.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-fox-gray">软实力分析将在对话中逐步生成，继续聊聊可以解锁更多洞察。</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="growth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-fox-orange" />
                  成长建议
                </CardTitle>
                <CardDescription>Foxity 的个性化建议</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedSuggestions.map((suggestion, idx) => {
                  const style = priorityStyle[suggestion.priority] || priorityStyle.medium;
                  return (
                    <div
                      key={idx}
                      className="flex gap-4 rounded-xl border border-fox-gray-light bg-white p-4"
                    >
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${style.dot}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-fox-navy">{suggestion.area}</h4>
                          <Badge variant="outline" className={`${style.text} border-current`}>
                            优先级：{style.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-fox-gray">{suggestion.suggestion}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      )}

      {/* 隐藏的导出区域：包含所有 tab 内容 */}
      {data && (
      <div id="export-container" style={{ position: "absolute", left: "-9999px", top: "0", width: "800px", background: "#ffffff", padding: "24px" }}>
        {/* 封面：独占一页，HTML 渲染保证中文正常 */}
        <div data-export-section data-export-cover style={{ minHeight: "1050px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", background: "#ffffff" }}>
          <div style={{ fontSize: "13px", letterSpacing: "6px", color: "#ff9f4d", fontWeight: 700, marginBottom: "28px" }}>F O X I T Y</div>
          <h1 style={{ fontSize: "38px", fontWeight: 700, color: "#2b4c7e", margin: 0 }}>能力画像报告</h1>
          <div style={{ width: "56px", height: "4px", backgroundColor: "#ff9f4d", borderRadius: "2px", margin: "28px 0" }} />
          <div style={{ fontSize: "22px", fontWeight: 600, color: "#2b4c7e" }}>{data.user_name}</div>
          <div style={{ fontSize: "15px", color: "#666", marginTop: "10px" }}>{teamEmoji ? `${teamEmoji} ` : ""}{teamName}</div>
          <div style={{ fontSize: "13px", color: "#999", marginTop: "48px" }}>生成时间：{new Date().toLocaleDateString("zh-CN")}</div>
          <div style={{ fontSize: "11px", color: "#bbb", marginTop: "12px" }}>NextStep 2026 武汉站参赛项目</div>
        </div>

        {/* 概览 */}
        <div data-export-section>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#2b4c7e", marginBottom: "16px" }}>概览</h2>
          {data.tags && data.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
              {data.tags.map((tag, idx) => (
                <span key={idx} style={{ backgroundColor: "#f2aa72", color: "white", padding: "4px 12px", borderRadius: "9999px", fontSize: "14px" }}>{tag}</span>
              ))}
            </div>
          )}
          {data.highlights && data.highlights.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#2b4c7e", marginBottom: "8px" }}>亮点</h3>
              {data.highlights.map((h, idx) => (
                <div key={idx} style={{ fontSize: "14px", color: "#2b4c7e", marginBottom: "4px" }}>
                  <Sparkles className="mr-1 inline h-3.5 w-3.5 align-[-2px] text-fox-orange" /> {h}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#2b4c7e", marginBottom: "8px" }}>核心定位</h3>
            <p style={{ fontSize: "14px", color: "#666" }}>{data.overview_summary}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#2b4c7e", marginBottom: "8px" }}>硬技能分数</h3>
              {(Object.keys(data.abilities) as HardSkillKey[]).map((key) => {
                const a = data.abilities[key];
                return (
                  <div key={key} style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#2b4c7e" }}>
                      <span>{hardSkillLabels[key]}</span>
                      <span>{a.score}/10</span>
                    </div>
                    <div style={{ height: "8px", backgroundColor: "#f0f0f0", borderRadius: "4px", marginTop: "4px" }}>
                      <div style={{ width: `${a.score * 10}%`, height: "100%", backgroundColor: "#FF9F4D", borderRadius: "4px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#2b4c7e", marginBottom: "8px" }}>关键能力标签</h3>
              {keywordTags.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {keywordTags.map((item, idx) => (
                    <span key={idx} style={{ backgroundColor: item.confidence === "high" ? "#f2aa72" : item.confidence === "medium" ? "#f2aa7280" : "#f2aa7240", color: item.confidence === "low" ? "#666" : "white", padding: "3px 10px", borderRadius: "9999px", fontSize: "12px" }}>{item.tag}</span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: "#999" }}>暂无</p>
              )}
            </div>
          </div>
        </div>

        {/* 能力详解 */}
        <div data-export-section>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#2b4c7e", marginTop: "32px", marginBottom: "16px" }}>能力详解</h2>
          {(Object.keys(data.abilities) as HardSkillKey[]).map((key) => {
            const a = data.abilities[key];
            return (
              <div key={key} style={{ marginBottom: "16px", padding: "12px", border: "1px solid #e5e5e5", borderRadius: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: "bold", color: "#2b4c7e" }}>{hardSkillLabels[key]}</span>
                  <span style={{ fontWeight: "bold", color: "#2b4c7e" }}>{a.score}/10</span>
                </div>
                <div style={{ height: "8px", backgroundColor: "#f0f0f0", borderRadius: "4px", marginBottom: "8px" }}>
                  <div style={{ width: `${a.score * 10}%`, height: "100%", backgroundColor: "#FF9F4D", borderRadius: "4px" }} />
                </div>
                {a.insights.length > 0 && (
                  <ul style={{ fontSize: "13px", color: "#666", paddingLeft: "16px" }}>
                    {a.insights.map((insight, i) => (
                      <li key={i} style={{ marginBottom: "4px" }}>{insight}</li>
                    ))}
                  </ul>
                )}
                {a.evidence_events.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <p style={{ fontSize: "13px", fontWeight: "bold", color: "#2b4c7e" }}>证据事件</p>
                    {a.evidence_events.map((ev, i) => (
                      <p key={i} style={{ fontSize: "13px", color: "#2b4c7e", backgroundColor: "#f9f7ef", padding: "6px 10px", borderRadius: "6px", marginTop: "4px" }}>▸ {ev}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 软实力 */}
        <div data-export-section>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#2b4c7e", marginTop: "32px", marginBottom: "16px" }}>软实力</h2>
          {data.soft_skill_narrative && (
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#2b4c7e", marginBottom: "8px" }}>软实力画像</h3>
              <p style={{ fontSize: "14px", color: "#2b4c7e", lineHeight: "1.6" }}>{data.soft_skill_narrative}</p>
            </div>
          )}
          {softSkillEntries.length > 0 && (
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#2b4c7e", marginBottom: "8px" }}>软实力维度</h3>
              {softSkillEntries.map(([key, val]) => {
                const meta = softSkillMeta.find((m) => m.key === key);
                return (
                  <div key={key} style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#2b4c7e" }}>
                      <span>{meta?.name || val.label || key}</span>
                      <span>{val.score}/10</span>
                    </div>
                    <div style={{ height: "8px", backgroundColor: "#f0f0f0", borderRadius: "4px", marginTop: "4px" }}>
                      <div style={{ width: `${val.score * 10}%`, height: "100%", backgroundColor: "#7ec4a8", borderRadius: "4px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 成长建议 */}
        <div data-export-section>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#2b4c7e", marginTop: "32px", marginBottom: "16px" }}>成长建议</h2>
          {sortedSuggestions.map((suggestion, idx) => {
            const colors: Record<string, string> = { high: "#ef4444", medium: "#eab308", low: "#22c55e" };
            const color = colors[suggestion.priority] || "#eab308";
            const labels: Record<string, string> = { high: "高", medium: "中", low: "低" };
            return (
              <div key={idx} style={{ marginBottom: "12px", padding: "12px", border: "1px solid #e5e5e5", borderRadius: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "bold" }}>{idx + 1}</div>
                  <span style={{ fontWeight: "bold", color: "#2b4c7e" }}>{suggestion.area}</span>
                  <span style={{ fontSize: "12px", color, border: `1px solid ${color}`, borderRadius: "9999px", padding: "2px 8px" }}>优先级：{labels[suggestion.priority]}</span>
                </div>
                <p style={{ fontSize: "13px", color: "#666" }}>{suggestion.suggestion}</p>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </main>
  );
}
