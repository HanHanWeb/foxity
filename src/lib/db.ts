import { createClient, type Client } from "@libsql/client";

const TURSO_URL = process.env.TURSO_DATABASE_URL || "libsql://foxity-hanhanweb.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN =
  process.env.TURSO_AUTH_TOKEN ||
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODg0Mzg4OTYsImlkIjoiMDFhMDY3NDMtYzQwMS03Nzc5LTg4MjItNjJmMzBkOWQxNjQ3Iiwia2lkIjoiOUZYOXBHdFlhcjA1ZHRldXBVb0NxWmhIdG40VXBGRGFzRS1YNjJXZ0xHcyIsInJpZCI6ImNiNTVkMWJmLWM2NDQtNGU4OS04Y2VlLTYxMTY1ODcxODQzMCJ9.CRUragLvrAU21KbCvUf3FUBKPlhRu6rHwpJthosL4i0UHUv4lC6u9wQfo9LVHby6IGrdmdOS3q5abhHDl7_RAQ";

let _client: Client | null = null;

export function getDb(): Client {
  if (!_client) {
    _client = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
  }
  return _client;
}

// ===== 建表语句 =====

const CREATE_TEAMS = `CREATE TABLE IF NOT EXISTS teams (
  team_id TEXT PRIMARY KEY,
  team_name TEXT NOT NULL,
  team_emoji TEXT NOT NULL DEFAULT '',
  competition_type TEXT NOT NULL DEFAULT '默认',
  organizer_name TEXT NOT NULL DEFAULT '',
  owner_user_id TEXT,
  created_at TEXT NOT NULL
)`;

// profiles 改为复合主键 (user_id, team_id)，同一用户可在不同团队拥有不同画像
const CREATE_PROFILES = `CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (user_id, team_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE
)`;

const CREATE_CHAT_HISTORY = `CREATE TABLE IF NOT EXISTS chat_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  emotion TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE
)`;

const CREATE_USERS = `CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
)`;

const CREATE_SESSIONS = `CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
)`;

const CREATE_DIMENSION_EVIDENCE = `CREATE TABLE IF NOT EXISTS dimension_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  evidence_level TEXT NOT NULL,
  quality_score REAL NOT NULL,
  summary TEXT,
  quote TEXT,
  chat_round INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE
)`;

// team_members 表：成员关系 + 角色 + 职位
// 之前成员关系挂在 profiles 表，职责不清。单独拆一张轻量表管"谁在哪个队、什么角色、什么职位"
const CREATE_TEAM_MEMBERS = `CREATE TABLE IF NOT EXISTS team_members (
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  position TEXT NOT NULL DEFAULT '',
  joined_at TEXT NOT NULL,
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE
)`;

// 安全地为已有表添加列（列已存在则静默忽略）
async function addColumnIfMissing(db: Client, table: string, column: string, definition: string) {
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[db] ${table}.${column} column added`);
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || "")) {
      // 列已存在或其他非致命错误，忽略
    }
  }
}

// 建表（幂等执行，应用启动时调用一次即可）
export async function initDb() {
  const db = getDb();

  // 1. 先建表（IF NOT EXISTS 保证幂等，不会破坏已有表）
  await db.executeMultiple(`
    ${CREATE_TEAMS};
    ${CREATE_PROFILES};
    ${CREATE_CHAT_HISTORY};
    ${CREATE_USERS};
    ${CREATE_SESSIONS};
    ${CREATE_DIMENSION_EVIDENCE};
    ${CREATE_TEAM_MEMBERS};

    CREATE INDEX IF NOT EXISTS idx_profiles_team ON profiles(team_id);
    CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_team ON chat_history(team_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_user ON dimension_evidence(user_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_dimension ON dimension_evidence(dimension);
    CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
  `);

  // 2. 增量迁移：为旧表补齐可能缺失的列（幂等，列已存在会静默跳过）
  await addColumnIfMissing(db, "users", "email", "TEXT");
  await addColumnIfMissing(db, "teams", "owner_user_id", "TEXT");
  // SQLite 不允许 ALTER TABLE ADD COLUMN 带 NOT NULL DEFAULT 而无默认值，这里用空字符串默认值
  await addColumnIfMissing(db, "teams", "team_emoji", "TEXT NOT NULL DEFAULT ''");

  // 3. profiles 表迁移：如果旧表是 user_id 单主键，重建为复合主键
  // 安全检查：只有当 user_id 是主键时才需要迁移
  try {
    const res = await db.execute(`PRAGMA table_info(profiles)`);
    const rows = res.rows as unknown as { name: string; pk: number }[];
    if (rows.length > 0) {
      const pkColumns = rows.filter((r) => r.pk > 0).map((r) => r.name);
      // 如果旧表主键只有 user_id，说明是旧结构，需要迁移
      if (pkColumns.length === 1 && pkColumns[0] === "user_id") {
        console.warn("[db] profiles 表为旧结构（user_id 单主键），开始迁移为复合主键...");
        await db.executeMultiple(`
          ALTER TABLE profiles RENAME TO profiles_old;
          ${CREATE_PROFILES};
          INSERT INTO profiles (user_id, user_name, team_id, timestamp, data)
            SELECT user_id, user_name, team_id, timestamp, data FROM profiles_old;
          DROP TABLE profiles_old;
        `);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_profiles_team ON profiles(team_id);`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);`);
        console.log("[db] profiles 表迁移完成");
      }
    }
  } catch (e: any) {
    console.warn("[db] profiles 表迁移检查失败（可忽略）:", e?.message);
  }

  // 4. team_members 数据迁移：把已有 profiles 记录同步到 team_members 表
  try {
    const existingMembers = await db.execute(
      `SELECT COUNT(*) AS cnt FROM team_members`
    );
    const memberCount = (existingMembers.rows[0] as any)?.cnt ?? 0;
    if (Number(memberCount) === 0) {
      // team_members 为空，从 profiles 表回填
      await db.execute(
        `INSERT OR IGNORE INTO team_members (team_id, user_id, role, position, joined_at)
         SELECT p.team_id, p.user_id,
                CASE WHEN t.owner_user_id = p.user_id THEN 'leader' ELSE 'member' END,
                COALESCE(json_extract(p.data, '$.core_positioning'), ''),
                p.timestamp
         FROM profiles p
         LEFT JOIN teams t ON p.team_id = t.team_id`
      );
      console.log("[db] team_members 数据迁移完成");
    }
  } catch (e: any) {
    console.warn("[db] team_members 数据迁移失败（可忽略）:", e?.message);
  }
}
