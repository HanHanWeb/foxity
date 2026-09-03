import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserId } from "@/lib/session";

// GET /api/teams/[teamId]/matrix — 能力矩阵数据（队长专属）
export async function GET(
  req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const db = getDb();

    // 权限校验：只有队长能看能力矩阵
    const teamRes = await db.execute({
      sql: `SELECT owner_user_id FROM teams WHERE team_id = ?`,
      args: [teamId],
    });
    if (teamRes.rows.length === 0) {
      return NextResponse.json({ error: "团队不存在" }, { status: 404 });
    }
    const ownerId = teamRes.rows[0].owner_user_id as string | null;
    if (ownerId !== userId) {
      return NextResponse.json({ error: "只有队长可以查看能力矩阵" }, { status: 403 });
    }

    // 查所有成员的画像
    const profilesResult = await db.execute({
      sql: `SELECT user_id, user_name, data FROM profiles WHERE team_id = ?`,
      args: [teamId],
    });

    const members = profilesResult.rows.map((row) => {
      let parsedData: any = null;
      try {
        parsedData = row.data ? JSON.parse(row.data as string) : null;
      } catch {}
      return {
        user_id: row.user_id,
        user_name: row.user_name,
        data: parsedData,
      };
    });

    // 提取每个成员的验证分和可信度
    const matrix = members.map((m) => {
      const data = m.data || {};
      const verifiedScores = data.v3_score_data?.verified_scores || {};
      const credibility = data.v3_credibility?.overall_level || "-";
      const twelveType = data.v3_type?.primary_type || null;
      return {
        user_id: m.user_id,
        user_name: m.user_name,
        verified_scores: verifiedScores,
        credibility,
        twelve_type: twelveType,
      };
    });

    return NextResponse.json({ matrix });
  } catch (error: any) {
    console.error("Matrix error:", error);
    return NextResponse.json(
      { error: "获取能力矩阵失败", details: error?.message },
      { status: 500 }
    );
  }
}
