"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, ArrowLeft, ArrowRight, Crown, UserPlus, Trash2, LogOut } from "lucide-react";
import { HomeNavbar } from "@/components/Layout/HomeNavbar";
import { JoinTeamDialog } from "@/components/JoinTeamDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

interface MyTeam {
  team_id: string;
  team_name: string;
  team_emoji?: string;
  competition_type: string;
  organizer_name: string;
  created_at: string;
  joined_at?: string;
  member_count?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [owned, setOwned] = useState<MyTeam[]>([]);
  const [joined, setJoined] = useState<MyTeam[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      (async () => {
        try {
          const res = await fetch("/api/teams", { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            setOwned(data.owned || []);
            setJoined(data.joined || []);
          }
        } catch (e) {
          console.error("fetch teams error:", e);
        } finally {
          setFetching(false);
        }
      })();
    } else if (!loading && !user) {
      setFetching(false);
    }
  }, [loading, user]);

  const handleDelete = async (team: MyTeam, isOwner: boolean) => {
    const confirmText = isOwner
      ? `确定删除团队「${team.team_name}」吗？所有成员和聊天记录将被清除，此操作不可撤销。`
      : `确定退出团队「${team.team_name}」吗？你的测评数据和聊天记录将从此团队移除。`;
    if (!confirm(confirmText)) return;

    setDeleting(team.team_id);
    try {
      const res = await fetch(`/api/teams/${team.team_id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        if (isOwner) {
          setOwned((prev) => prev.filter((t) => t.team_id !== team.team_id));
        } else {
          setJoined((prev) => prev.filter((t) => t.team_id !== team.team_id));
        }
      }
    } catch (e) {
      console.error("delete/leave team error:", e);
    } finally {
      setDeleting(null);
    }
  };

  if (loading || fetching) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-fox-gray" />
      </main>
    );
  }

  const renderTeamCard = (team: MyTeam, isOwner: boolean) => {
    const timeLabel = isOwner
      ? `创建于 ${new Date(team.created_at).toLocaleDateString("zh-CN")}`
      : `加入于 ${new Date(team.joined_at || team.created_at).toLocaleDateString("zh-CN")}`;
    const memberCount = team.member_count ?? 0;

    return (
      <Card
        key={team.team_id}
        className="w-full cursor-pointer py-0 transition-all hover:shadow-md"
        onClick={() => router.push(`/team/${team.team_id}`)}
      >
        <CardContent className="flex items-center justify-between p-5">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-fox-navy">
              {team.team_emoji && <span className="mr-1.5">{team.team_emoji}</span>}
              {team.team_name}
            </h3>
            <div className="mt-1 flex items-center gap-3 text-xs text-fox-gray">
              <span>团队码：<span className="font-mono font-bold text-fox-navy">{team.team_id}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-1 text-xs text-fox-gray">
              <span>{timeLabel}</span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {memberCount} 人
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 text-fox-gray hover:text-fox-coral"
              disabled={deleting === team.team_id}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(team, isOwner);
              }}
            >
              {deleting === team.team_id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isOwner ? (
                <Trash2 className="h-4 w-4" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </Button>
            <ArrowRight className="h-5 w-5 flex-shrink-0 text-fox-gray" />
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmpty = (text: string) => (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-fox-cream">
          <Users className="h-7 w-7 text-fox-gray" />
        </div>
        <p className="text-sm text-fox-gray">{text}</p>
      </CardContent>
    </Card>
  );

  return (
    <main className="min-h-screen bg-fox-cream/30 pb-12">
      <HomeNavbar />

      <div className="mx-auto max-w-6xl px-4 pt-24 md:px-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回首页
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-fox-navy">控制台</h1>
        </div>

        {/* 我创建的团队 */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-fox-navy" />
              <h2 className="text-lg font-semibold text-fox-navy">我创建的团队</h2>
              <span className="text-sm text-fox-gray">({owned.length})</span>
            </div>
            <Button variant="default" size="sm" className="bg-[#2b4c7e] text-white hover:bg-[#2b4c7e]/90" onClick={() => router.push("/team/create")}>
              创建团队
            </Button>
          </div>
          {owned.length === 0 ? (
            renderEmpty("还没有创建过团队")
          ) : (
            <div className="flex flex-col gap-3">
              {owned.map((t) => renderTeamCard(t, true))}
            </div>
          )}
        </section>

        {/* 我加入的团队 */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-fox-navy" />
              <h2 className="text-lg font-semibold text-fox-navy">我加入的团队</h2>
              <span className="text-sm text-fox-gray">({joined.length})</span>
            </div>
            <Button variant="default" size="sm" className="bg-[#2b4c7e] text-white hover:bg-[#2b4c7e]/90" onClick={() => setJoinOpen(true)}>
              加入团队
            </Button>
          </div>
          {joined.length === 0 ? (
            renderEmpty("还没有加入过团队")
          ) : (
            <div className="flex flex-col gap-3">
              {joined.map((t) => renderTeamCard(t, false))}
            </div>
          )}
        </section>
      </div>

      <JoinTeamDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </main>
  );
}
