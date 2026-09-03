"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Users, Loader2, Mail, X, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/store/useStore";
import { CopyButton } from "@/components/CopyButton";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function CreateTeamPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const createTeam = useStore((state) => state.createTeam);

  const [teamName, setTeamName] = useState("");
  const [emojiIndex, setEmojiIndex] = useState(0);
  const directionRef = useRef(0); // 1=向右切换, -1=向左切换
  const EMOJI_LIST = ["✨", "🎉", "💡", "🏷️", "🎨", "🕹️", "🔥", "🌟", "🚀", "🌈", "🍀", "🌸", "☕", "🎵", "⚡", "🏔️", "🌊", "🦊"];
  const teamEmoji = EMOJI_LIST[emojiIndex];
  const visibleCount = 5; // 中间 + 左右各2
  const half = Math.floor(visibleCount / 2);

  // 只能点击相邻的左右两个（pos=±1），中间不响应，更远的纯展示
  const selectEmoji = (idx: number) => {
    const diff = getRelativePos(idx);
    if (Math.abs(diff) !== 1) return;
    directionRef.current = diff;
    setEmojiIndex(idx);
  };

  const goNext = () => {
    directionRef.current = 1;
    setEmojiIndex((emojiIndex + 1) % EMOJI_LIST.length);
  };

  const goPrev = () => {
    directionRef.current = -1;
    setEmojiIndex((emojiIndex - 1 + EMOJI_LIST.length) % EMOJI_LIST.length);
  };

  const getRelativePos = (i: number) => {
    let diff = i - emojiIndex;
    const len = EMOJI_LIST.length;
    // 环绕
    if (diff > len / 2) diff -= len;
    if (diff < -len / 2) diff += len;
    return diff;
  };
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const organizerName = user?.name || "";
    if (!organizerName.trim()) {
      setError("无法获取用户姓名，请重新登录后再试");
      return;
    }
    if (!teamName.trim() || creating) return;
    setCreating(true);
    try {
      const code = await createTeam(teamName.trim(), "默认", organizerName.trim(), teamEmoji);
      setTeamCode(code);
    } catch (e) {
      setError("生成团队码失败，请重试");
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const inviteLink = teamCode ? `${mounted ? window.location.origin : ""}/team/${teamCode}/join` : "";

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!EMAIL_RE.test(trimmed)) {
      setInviteMsg({ type: "error", text: "邮箱格式不正确" });
      return;
    }
    if (inviteEmails.includes(trimmed)) {
      setInviteMsg({ type: "error", text: "该邮箱已添加" });
      return;
    }
    setInviteEmails([...inviteEmails, trimmed]);
    setEmailInput("");
    setInviteMsg(null);
  };

  const removeEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter((e) => e !== email));
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail();
    }
  };

  const sendInvites = async () => {
    if (inviteEmails.length === 0 || !teamCode) return;
    setSending(true);
    setInviteMsg(null);
    try {
      const res = await fetch("/api/teams/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamCode,
          emails: inviteEmails,
          inviterName: user?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteMsg({ type: "error", text: data.error || "发送失败" });
        return;
      }
      setInviteMsg({ type: "success", text: `已成功向 ${data.sent} 位队友发送邀请邮件` });
      setInviteEmails([]);
    } catch {
      setInviteMsg({ type: "error", text: "网络错误，请重试" });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-fox-gray" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-lg">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回首页
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{teamCode ? "团队码生成成功" : "创建团队"}</CardTitle>
            <CardDescription>
              {teamCode
                ? "把链接发给队友，他们完成测评后你就能看到全队能力矩阵。"
                : "填写团队信息，生成团队码。创建者默认是队长。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!teamCode ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>团队标识</Label>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={goPrev}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-fox-gray-light bg-white text-fox-gray transition-colors hover:border-fox-orange/40 hover:text-fox-orange"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="relative flex h-24 items-center justify-center overflow-hidden" style={{ width: "260px" }}>
                      {EMOJI_LIST.map((emoji, i) => {
                        const pos = getRelativePos(i);
                        if (Math.abs(pos) > half) return null;
                        const isActive = pos === 0;
                        const isClickable = Math.abs(pos) === 1;
                        // 新进入的边缘 emoji，根据切换方向从对应侧滑入
                        const isEntering = Math.abs(pos) === half;
                        return (
                          <motion.button
                            key={emoji}
                            type="button"
                            onClick={() => isClickable && selectEmoji(i)}
                            initial={isEntering ? { x: pos * 48 + directionRef.current * 80, opacity: 0 } : false}
                            animate={{
                              x: pos * 48,
                              scale: isActive ? 1 : 0.7 - Math.abs(pos) * 0.08,
                              opacity: isActive ? 1 : 0.4 - Math.abs(pos) * 0.12,
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={cn(
                              "absolute flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl",
                              isActive
                                ? "border-fox-orange bg-fox-orange/10 cursor-default"
                                : isClickable
                                ? "border-fox-gray-light bg-white cursor-pointer"
                                : "border-transparent bg-transparent cursor-default"
                            )}
                            style={{ zIndex: isActive ? 10 : 5 - Math.abs(pos) }}
                          >
                            {emoji}
                          </motion.button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={goNext}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-fox-gray-light bg-white text-fox-gray transition-colors hover:border-fox-orange/40 hover:text-fox-orange"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="teamName">团队名称</Label>
                  <Input
                    id="teamName"
                    placeholder="请输入团队名称"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <Button type="submit" variant="secondary" className="w-full" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    "生成团队码"
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-fox-gray-light bg-fox-cream p-6 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-fox-mint" />
                  <p className="text-sm text-fox-gray">你的团队码</p>
                  <p className="mt-1 text-4xl font-bold text-fox-navy tracking-wider">{teamCode}</p>
                </div>

                <div className="space-y-2">
                  <Label>邀请链接</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteLink} className="bg-fox-gray-bg" />
                    <CopyButton value={inviteLink} size="icon" />
                  </div>
                </div>

                {/* 邮件邀请 */}
                <div className="space-y-3 rounded-xl border border-fox-gray-light bg-fox-gray-bg/30 p-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-fox-orange" />
                    <Label className="cursor-pointer">邮件邀请队友</Label>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="输入队友邮箱，回车或逗号添加"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={handleEmailKeyDown}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addEmail}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {inviteEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {inviteEmails.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 rounded-full bg-fox-orange/10 px-3 py-1 text-sm text-fox-navy"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => removeEmail(email)}
                            className="text-fox-gray hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {inviteMsg && (
                    <p className={`text-sm ${inviteMsg.type === "success" ? "text-fox-mint" : "text-red-500"}`}>
                      {inviteMsg.text}
                    </p>
                  )}

                  {inviteEmails.length > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      disabled={sending}
                      onClick={sendInvites}
                    >
                      {sending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          发送中...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          发送邀请邮件（{inviteEmails.length} 人）
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="grid gap-2 pt-2 md:grid-cols-2">
                  <Button
                    className="border-transparent bg-fox-yellow text-fox-navy hover:bg-fox-yellow/85"
                    onClick={() => router.push(`/team/${teamCode}/join`)}
                  >
                    开始我的测评
                  </Button>
                  <Button variant="outline" onClick={() => router.push(`/team/${teamCode}`)}>
                    <Users className="mr-2 h-4 w-4" />
                    查看团队看板
                  </Button>
                </div>

                <p className="text-center text-xs text-fox-gray">
                  把链接发给队友，他们完成测评后你就能看到全队能力矩阵。
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
