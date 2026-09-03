import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserId } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;

    const db = getDb();

    const teamResult = await db.execute({
      sql: `SELECT team_id, team_name, team_emoji, competition_type, organizer_name, owner_user_id, created_at
            FROM teams WHERE team_id = ?`,
      args: [teamId],
    });

    if (teamResult.rows.length === 0) {
      return NextResponse.json({ error: "团队不存在" }, { status: 404 });
    }

    const teamRow = teamResult.rows[0];

    // 权限校验：队长 或 team_members 里的成员 都可访问看板
    const userId = await getUserId();
    const ownerId = teamRow.owner_user_id as string | null;
    if (!userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const isOwner = ownerId === userId;
    if (!isOwner) {
      // 校验是否为团队成员
      const memberCheck = await db.execute({
        sql: `SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ? LIMIT 1`,
        args: [teamId, userId],
      });
      // profiles 表也算成员关系（历史数据兼容）
      const profileCheck = memberCheck.rows.length === 0
        ? await db.execute({
            sql: `SELECT 1 FROM profiles WHERE team_id = ? AND user_id = ? LIMIT 1`,
            args: [teamId, userId],
          })
        : { rows: [1] };
      if (memberCheck.rows.length === 0 && profileCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "无权访问，你不是该团队成员" },
          { status: 403 }
        );
      }
    }

    const team = {
      team_id: teamRow.team_id,
      team_name: teamRow.team_name,
      team_emoji: teamRow.team_emoji,
      competition_type: teamRow.competition_type,
      organizer_name: teamRow.organizer_name,
      created_at: teamRow.created_at,
    };

    // 查 team_members 表获取角色和职位
    const membersResult = await db.execute({
      sql: `SELECT user_id, role, position FROM team_members WHERE team_id = ?`,
      args: [teamId],
    });
    const memberMeta: Record<string, { role: string; position: string }> = {};
    membersResult.rows.forEach((r) => {
      memberMeta[r.user_id as string] = {
        role: (r.role as string) || "member",
        position: (r.position as string) || "",
      };
    });

    const profilesResult = await db.execute({
      sql: `SELECT user_id, user_name, team_id, timestamp, data
            FROM profiles WHERE team_id = ?`,
      args: [teamId],
    });

    const members = profilesResult.rows.map((row) => {
      let parsedData: any = null;
      try {
        parsedData = row.data ? JSON.parse(row.data as string) : null;
      } catch (e) {
        console.error("Failed to parse profile data for user", row.user_id, e);
      }
      const meta = memberMeta[row.user_id as string] || { role: "member", position: "" };
      // 展平 parsedData 到顶层，确保前端能直接访问 v3_score_data / abilities / v3_credibility 等字段
      return {
        user_id: row.user_id,
        user_name: row.user_name,
        team_id: row.team_id,
        timestamp: row.timestamp,
        role: meta.role,
        position: meta.position,
        ...(parsedData || {}),
      };
    });

    // 当前用户在该团队的角色
    const isLeader = ownerId === userId;
    const currentUserRole = isLeader ? "leader" : "member";

    return NextResponse.json({ ...team, members, currentUserRole, currentUserId: userId });
  } catch (error: any) {
    console.error("Fetch team error:", error);
    return NextResponse.json(
      { error: "获取团队失败", details: error?.message },
      { status: 500 }
    );
  }
}

// 删除团队（队长）或退出团队（成员）
export async function DELETE(
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

    // 查团队
    const teamRes = await db.execute({
      sql: `SELECT owner_user_id FROM teams WHERE team_id = ?`,
      args: [teamId],
    });
    if (teamRes.rows.length === 0) {
      return NextResponse.json({ error: "团队不存在" }, { status: 404 });
    }

    const ownerId = teamRes.rows[0].owner_user_id as string | null;

    // 权限判断：仅队长可删除团队；成员走退出逻辑
    const isOwner = ownerId === userId;

    if (isOwner) {
      // 队长删除团队：删除所有关联数据
      // 用 try-catch 包裹子表删除，避免外键约束等问题导致 teams 行没被删
      try {
        await db.execute({ sql: `DELETE FROM chat_history WHERE team_id = ?`, args: [teamId] });
      } catch (e) {
        console.warn("[DELETE team] chat_history delete failed:", e);
      }
      try {
        await db.execute({ sql: `DELETE FROM dimension_evidence WHERE team_id = ?`, args: [teamId] });
      } catch (e) {
        console.warn("[DELETE team] dimension_evidence delete failed:", e);
      }
      try {
        await db.execute({ sql: `DELETE FROM team_members WHERE team_id = ?`, args: [teamId] });
      } catch (e) {
        console.warn("[DELETE team] team_members delete failed:", e);
      }
      try {
        await db.execute({ sql: `DELETE FROM profiles WHERE team_id = ?`, args: [teamId] });
      } catch (e) {
        console.warn("[DELETE team] profiles delete failed:", e);
      }
      try {
        await db.execute({ sql: `DELETE FROM teams WHERE team_id = ?`, args: [teamId] });
      } catch (e) {
        console.error("[DELETE team] teams delete failed:", e);
        return NextResponse.json({ error: "删除团队失败", details: String(e) }, { status: 500 });
      }
      console.log("[DELETE team] success, teamId:", teamId);
      return NextResponse.json({ action: "deleted" });
    } else {
      // 成员退出团队：删除自己的 profile、聊天记录和成员关系
      try { await db.execute({ sql: `DELETE FROM chat_history WHERE user_id = ? AND team_id = ?`, args: [userId, teamId] }); } catch {}
      try { await db.execute({ sql: `DELETE FROM dimension_evidence WHERE user_id = ? AND team_id = ?`, args: [userId, teamId] }); } catch {}
      try { await db.execute({ sql: `DELETE FROM profiles WHERE user_id = ? AND team_id = ?`, args: [userId, teamId] }); } catch {}
      try { await db.execute({ sql: `DELETE FROM team_members WHERE user_id = ? AND team_id = ?`, args: [userId, teamId] }); } catch {}
      return NextResponse.json({ action: "left" });
    }
  } catch (error: any) {
    console.error("Delete/leave team error:", error);
    return NextResponse.json(
      { error: "操作失败", details: error?.message },
      { status: 500 }
    );
  }
}
