import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";

// GET /api/chat-history/[userId]?team_id=xxx
// 获取指定用户在指定团队的聊天记录（本人 或 该团队队长/成员）
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authUserId = await requireUser();
    if (authUserId instanceof NextResponse) return authUserId;

    const { userId } = await params;
    const url = new URL(req.url);
    const teamId = url.searchParams.get("team_id");

    if (!teamId) {
      return NextResponse.json({ error: "缺少 team_id 参数" }, { status: 400 });
    }

    // 鉴权：本人直接放行；他人需为该团队队长或成员
    if (userId !== authUserId) {
      const db = getDb();
      const teamRes = await db.execute({
        sql: `SELECT owner_user_id FROM teams WHERE team_id = ?`,
        args: [teamId],
      });
      if (teamRes.rows.length === 0) {
        return NextResponse.json({ error: "团队不存在" }, { status: 404 });
      }
      const ownerId = teamRes.rows[0].owner_user_id as string | null;
      if (ownerId !== authUserId) {
        const memberRes = await db.execute({
          sql: `SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ? LIMIT 1`,
          args: [teamId, authUserId],
        });
        if (memberRes.rows.length === 0) {
          return NextResponse.json({ error: "无权查看该聊天记录" }, { status: 403 });
        }
      }
    }

    const db = getDb();
    const result = await db.execute({
      sql: `SELECT role, content, emotion, created_at
            FROM chat_history WHERE user_id = ? AND team_id = ?
            ORDER BY id ASC`,
      args: [userId, teamId],
    });

    const history = result.rows.map((row) => ({
      role: row.role,
      content: row.content,
      emotion: row.emotion,
      created_at: row.created_at,
    }));

    return NextResponse.json(history);
  } catch (error: any) {
    console.error("Fetch chat history error:", error);
    return NextResponse.json(
      { error: "获取聊天记录失败", details: error?.message },
      { status: 500 }
    );
  }
}
