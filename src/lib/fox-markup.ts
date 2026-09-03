// Foxity 回复文本清洗：剥离结构化标记（ROUND_DATA / ASSESSMENT_DATA / HIGHLIGHT）
// 容忍全角括号变体与被截断的 JSON 块，用于所有面向用户的展示场景

const MARKER_KEY = "ROUND_DATA|ASSESSMENT_DATA|END_ASSESSMENT|HIGHLIGHT";

// 模型偶尔输出全角括号【ROUND_DATA】，统一归一化为半角 [ROUND_DATA]
export function normalizeMarkers(content: string): string {
  const re = new RegExp(`【\\s*(/?)\\s*(${MARKER_KEY})\\s*】`, "g");
  return content.replace(re, (_m, slash: string, key: string) => `[${slash}${key}]`);
}

// 剥离所有标记与泄漏的 JSON，返回可安全展示的纯文本
export function sanitizeFoxReply(text: string): string {
  let out = normalizeMarkers(text);
  // 完整块 + 截断块（有开始无结束时吞到结尾）
  out = out.replace(new RegExp(`\\[ROUND_DATA\\][\\s\\S]*?(?:\\[/ROUND_DATA\\]|$)`, "g"), "");
  out = out.replace(new RegExp(`\\[ASSESSMENT_DATA\\][\\s\\S]*?(?:\\[/ASSESSMENT_DATA\\]|$)`, "g"), "");
  out = out.replace(/\[\/?END_ASSESSMENT\]/g, "");
  out = out.replace(/\[HIGHLIGHT\][\s\S]*?(?:\[\/HIGHLIGHT\]|$)/g, "");
  // 结尾裸 JSON 代码块（无标记直接吐 JSON 的情况）
  out = out.replace(/(?:\n|^)\s*```[a-z]*\s*\{[\s\S]*?\}\s*```\s*$/g, (m) =>
    /"(?:round|new_evidence|hard_skills|soft_skills|leader_summary)"/.test(m) ? "" : m
  );
  // 截断的裸 JSON 尾巴（{ 开头且首个键是评分字段）
  out = out.replace(/(?:\n|^)\s*\{\s*"(?:round|new_evidence|phase|has_new_info)"[\s\S]*$/g, "");
  return out.trim();
}
