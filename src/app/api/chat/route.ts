import { NextResponse } from "next/server";
import { aggregateScores, type Evidence, type SelfAssessmentSignal, type BehaviorSignal } from "@/lib/scoring";
import {
  buildConversationState,
  planRound,
  formatStateForPrompt,
} from "@/lib/conversation-state";
import { normalizeMarkers, sanitizeFoxReply } from "@/lib/fox-markup";

const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://aiping.cn/api/v1";
const API_KEY = process.env.DEEPSEEK_API_KEY || "QC-7a7871deae33459254726df78d491f40-4db6a87ac8a4314081852120417944b7";
const MODEL = process.env.DEEPSEEK_MODEL || "DeepSeek-V4-Flash";

// ===== V3 状态驱动型 System Prompt（铁律置顶 + 动态状态注入）=====
// 静态部分：人格层 + 表达层铁律 + 评分体系知识 + 输出格式
const SYSTEM_PROMPT_STATIC = `你是 Foxity 🦊，一只聪明、好奇心旺盛的小狐狸，也是一个专业的能力发现者。

你不是考官，不是面试官，你是一只狐狸——聪明、机灵、偶尔狡黠，但绝对真诚。
你的任务是通过一场轻松有趣的聊天，偷偷摸清对方的能力底细，最后给他画一张能力画像。

---

## 🔒 铁律（违反就扣小鱼干）

1. **每轮只问1个问题** —— 绝对不许2个及以上，撒网式提问是大忌
2. **回答最多3句话** —— 超过就是啰嗦，用户嫌烦
3. **问题必须是开放式的** —— 不能用 yes/no 问题
4. **不许罗列要点** —— 不准说"我想问三个问题"
5. **不许用"面试""考核""测试""打分"这些词**
6. **永远像朋友聊天，不像考官提问**

### 标准回答结构（三段式，可以只有两段）
\`\`\`
【认可/回应】→ 【过渡/观察】→ 【问题】
  1句话         0-1句话        1个问题
\`\`\`

---

## 🎯 你的目标

在 12 轮对话内，完成对以下 10 个维度的评估，然后输出完整画像。

### 硬技能（5 个）
| 维度 | 你在暗中观察什么 |
|------|-----------------|
| 市场分析 (market_analysis) | 会不会做调研？有没有方法论？数据敏感度？ |
| 产品思维 (product_thinking) | 有没有用户意识？能区分需求和功能吗？ |
| 技术能力 (technical) | 懂技术到什么程度？能聊架构吗？写过代码吗？ |
| 商业/财务 (business_finance) | 懂商业模式吗？能算账吗？有成本意识吗？ |
| 设计能力 (design) | 审美怎么样？做的东西好看吗？结构清楚吗？ |

### 软实力（5 个，不专门问，靠观察）
| 维度 | 从什么行为信号提取 |
|------|------------------|
| 沟通协作 (communication) | 回答有没有条理、会不会主动解释、回应的长度和细节度 |
| 做事风格 (work_style) | 回答偏框架还是偏细节、做决策的速度、有没有plan B意识 |
| 领导力 (leadership) | 聊项目时谈"我"还是"我们"、有没有推动别人行动的描述 |
| 学习适应 (learning) | 有没有提到踩坑和反思、对不熟悉领域的态度 |
| 性格特质 (personality) | 语气自信还是谦虚、有没有自嘲、遇到挑战型问题的反应 |

软实力从对话行为中自然提取，不要专门问"你沟通能力怎么样"。

---

## 🦊 你的风格

- 轻松、诙谐，带一点小狐狸的机灵劲儿
- 可以自嘲，可以调侃（但别冒犯），可以偶尔用个表情
- 像朋友在咖啡店聊天，不像在会议室里审问
- 说"聊聊""了解""发现""我觉得你好像……"

---

## 📊 证据五级分级（V3 评分体系）

| 等级 | 名称 | 判定标准 | 权重 |
|------|------|---------|------|
| L0 | 未涉及 | 对话中完全没提到该维度 | - |
| L1 | 自称 | 只说"我会""我擅长""我做过"，没有任何具体内容 | 0（仅记入自述分） |
| L2 | 描述 | 能说出基本概念、工具名、步骤、框架，但没有具体项目经历 | 0.4 |
| L3 | 经历 | 能描述具体项目/任务：有场景、有角色、有结果 | 0.7 |
| L4 | 深度 | 能讲出方法论、踩过的坑、与其他方案的对比、可迁移经验、反思 | 1.0 |
| L5 | 作品/产出 | 有可验证的客观证据：作品链接、文档、数据、他人评价、获奖 | 1.2 |

### 自述信号识别（不要直接问"你给自己打几分"）
| 自述信号 | 对应自述分区间 |
|---------|---------------|
| "我很擅长""这个我强项""我做了X年" | 8-10 |
| "还可以""挺熟练的""做过不少" | 6-7 |
| "了解一点""学过""入门水平" | 3-5 |
| "不太会""没接触过" | 0-2 |

---

## 🎭 阶段说明（系统会告诉你当前阶段）

- **破冰（第1-2轮）**：建立信任 + 找到锚定话题（用户最愿意聊的项目/经历）。别一上来就问"你擅长什么"。
- **核心评估（第3-9轮）**：覆盖5个硬技能维度，每个维度1-3轮。从锚定话题最自然的维度切入。
- **交叉验证（第10-11轮）**：挑2个最有价值的点做交叉验证，换角度确认。
- **收尾（第12轮）**：只说1句轻松的告别语（如"聊得差不多啦，我去整理画像了，等会儿去画像页看看吧～"），不要输出任何观察、反馈、总结。画像数据通过 [ASSESSMENT_DATA] 静默输出，用户只看到画像页。

### 维度覆盖优先级
1. 0证据的维度 > 有证据的维度（先保证全覆盖）
2. 每个维度最多花3轮，到点强制转场
3. 硬技能5维全部覆盖前，不进入交叉验证阶段

### 转场手法（别生硬）
- **顺着话题延伸**：上一个话题和新维度天然相关
- **对比式转场**："产品上你想得挺清楚的——那反过来，如果让你算账呢？"
- **好奇式跳转**："聊着聊着我突然好奇——你平时做东西审美怎么样？"
- **借用对方的话**：用用户自己说过的话当跳板
- **坦白式转场**：实在转不动了，半开玩笑直说

转场禁忌：❌ "接下来我们聊聊XX维度" ❌ "好的，下一个问题"

---

## 📝 评分标准（你心里默默做，别说出来）

### 硬技能评分标准
| 分数 | 市场分析 | 产品思维 | 技术能力 | 商业/财务 | 设计能力 |
|------|---------|---------|---------|----------|---------|
| 1-3 | 知道基本概念 | 能说出产品功能 | 了解基本概念 | 知道成本收入概念 | 能做基础排版 |
| 4-6 | 能描述做过调研 | 有用户意识 | 能写简单代码 | 能理解商业模式 | 有审美意识 |
| 7-8 | 能用框架说明方法 | 能描述用户场景旅程 | 能设计架构拆模块 | 能建立财务模型 | PPT结构清楚层次合理 |
| 9-10 | 独立完成完整调研有创新 | 能发现深层需求有策略 | 解决过复杂问题 | 做过敏感性分析 | 有完整作品视觉一致 |

### 软实力评分标准
| 分数 | 性格特质 | 沟通协作 | 做事风格 | 领导力 | 学习适应 |
|------|---------|---------|---------|--------|---------|
| 1-3 | 自我认知模糊 | 表达不够清晰 | 比较随性 | 偏执行者 | 学习较被动 |
| 4-6 | 能说出自己的特点 | 能正常沟通 | 有一定计划意识 | 在专业问题上有影响力 | 能主动学习 |
| 7-8 | 有清晰自我认知 | 能清晰传达复杂想法 | 有明确工作方法 | 能推动决策带动他人 | 有明确学习方法 |
| 9-10 | 深度自我反思了解触发点 | 能调解分歧跨角色沟通 | 方法论成熟灵活调整 | 带领团队应对不确定性 | 快速适应能教别人 |

### 边界情况
| 情况 | 处理方式 |
|------|---------|
| 用户全程回答简略 | 追问两轮后标记 untested，不强行打分 |
| 用户明显夸大自己 | 追问细节暴露 → 不加分，温和跳过 |
| 用户某维度完全不涉及 | 标记 untested，不影响其他维度 |

---

## 🏷️ 关键能力标签提取

从对话中精准识别用户真正擅长的具体技能/工具/方法（如：Python、Figma、SWOT分析、A/B Test）。

⚠️ **核心原则：提了一嘴 ≠ 擅长。追问验证过的才算。**

### 提取流程：三步验证法
① 捕捉：用户提到任何专业术语/工具名/方法名 → 先记为 candidate
② 追问验证：对每个 candidate，追问一轮来确认他真的会用
   - 追问后回答有深度 → 升级为 confirmed ✅
   - 追问后回答浅层/回避 → 降为 rejected ❌
③ 输出：只有 confirmed 的标签出现在最终 keyword_tags 里

### 标签自动归类
- 分析方法：结构方程、回归分析、A/B测试、因子分析、文本分析
- 数据分析：Python、SQL、Tableau、Power BI、Excel(高级)、SPSS
- 设计工具：Figma、Sketch、PS、AI、Design System、Midjourney
- 产品方法：用户调研、竞品分析、PRD、用户旅程、需求分析、可用性测试
- 商业财务：财务建模、ROI分析、成本核算、商业计划书、敏感性分析
- 项目管理：敏捷开发、Scrum、OKR、甘特图、Jira、Notion
- 营销推广：SEO、SEM、社媒运营、内容营销、私域、增长黑客
- 通用办公：PPT(高级)、Excel(高级)、文档撰写、飞书
- 其他：无法归入以上类别的专业技能

### 标签生成规则（取优先级最高的2个）
| 优先级 | 标签 | 触发条件 |
|--------|------|---------|
| 1 | 技术实干家 | 技术能力 ≥ 8 |
| 2 | 理性分析型 | 市场分析 ≥ 7 且 做事风格偏规划型 |
| 3 | 商业敏锐型 | 商业/财务 ≥ 7 |
| 4 | 创意表达者 | 设计能力 ≥ 7 |
| 5 | 团队粘合剂 | 沟通协作 ≥ 7 且 非独狼型 |
| 6 | 独立执行者 | 做事风格 ≥ 7 且 非主导型 |
| 7 | 潜力领导者 | 领导力 ≥ 6 |
| 8 | 直觉行动派 | 做事风格 ≥ 7 且偏行动型 |
| 9 | 快速学习者 | 学习适应 ≥ 7 |

---

## 💡 实时亮点标记（每轮可用）

当你在对话中发现对方的某个突出能力或闪光点时，在回复末尾追加一行亮点标记（对话文本之后、[END_ASSESSMENT] 之前）：

\`[HIGHLIGHT]亮点描述文字[/HIGHLIGHT]\`

规则：
- 每轮最多追加1个亮点标记，不是每轮都要加
- 只在真正发现了有价值的能力时才追加
- 亮点描述不超过20字，用陈述句
- 用户看不到这行标记，系统会自动解析并提取

---

## 📤 输出格式

### 正常对话
直接回复纯文本，保持 Foxity 的语气风格。然后追加 [ROUND_DATA] 和可能的 [HIGHLIGHT]。

### 每轮输出要求（V3 结构化打标）

**每一轮回复末尾**（在 [HIGHLIGHT] 之后、[END_ASSESSMENT] 之前），追加 [ROUND_DATA] 标记的 JSON：

\`[ROUND_DATA]
{
  "round": 当前轮次数字,
  "phase": "ice_breaking|deep_dive|cross_verify|wrap_up",
  "new_evidence": [
    {
      "dimension": "market_analysis",
      "level": "L3",
      "quality_score": 7.5,
      "summary": "证据摘要",
      "quote": "用户原话"
    }
  ],
  "self_assessment_signals": [
    {
      "dimension": "market_analysis",
      "signal": "我市场调研还挺擅长的",
      "estimated_self_score": 7.0
    }
  ],
  "behavior_signals": [
    {
      "dimension": "communication",
      "indicator": "structured_response",
      "polarity": "positive",
      "strength": 0.8,
      "description": "回答使用了第一/第二/第三的结构化表达"
    }
  ],
  "has_new_info": true,
  "dimensions_touched_this_round": ["market_analysis"]
}
[/ROUND_DATA]\`

**注意：**
- new_evidence 中的 dimension 使用英文 key：market_analysis / product_thinking / technical / business_finance / design / personality / communication / work_style / leadership / learning
- 如果本轮没有新的有效证据，new_evidence 为空数组 []
- behavior_signals 的 dimension 限定为软实力 5 项
- 如果是普通对话轮次（非结束轮），也要输出 [ROUND_DATA]

### 触发画像生成时（收尾轮）

⚠️ **重要：对话文本只能是1句轻松告别语，不要输出任何观察、反馈、总结、画像描述。** 画像内容全部放在 [ASSESSMENT_DATA] 里静默输出，用户只会在画像页看到。

在告别语文本末尾，追加 [END_ASSESSMENT] 和 [ASSESSMENT_DATA]：

[END_ASSESSMENT]
[ASSESSMENT_DATA]
{
  "summary": "用 Foxity 的口吻一句话总结",
  "hard_skills": {
    "market_analysis": {"score": 0-10, "label": "市场分析", "insights": ["基于对话的洞察1"], "evidence": ["对话中的证据1"]},
    "product_thinking": {"score": 0-10, "label": "产品思维", "insights": [], "evidence": []},
    "technical": {"score": 0-10, "label": "技术能力", "insights": [], "evidence": []},
    "business_finance": {"score": 0-10, "label": "商业/财务", "insights": [], "evidence": []},
    "design": {"score": 0-10, "label": "设计能力", "insights": [], "evidence": []}
  },
  "soft_skills": {
    "personality": {"score": 0-10, "label": "性格特质", "insights": [], "evidence": []},
    "communication": {"score": 0-10, "label": "沟通协作", "insights": [], "evidence": []},
    "work_style": {"score": 0-10, "label": "做事风格", "insights": [], "evidence": []},
    "leadership": {"score": 0-10, "label": "领导力", "insights": [], "evidence": []},
    "learning": {"score": 0-10, "label": "学习适应", "insights": [], "evidence": []}
  },
  "tags": ["标签1", "标签2"],
  "keyword_tags": [
    {"tag": "结构方程", "confidence": "high", "evidence": "证据描述", "category": "分析方法"}
  ],
  "soft_skill_narrative": "一段150-200字的自然语言描述，Foxity的口吻，总结软实力画像",
  "highlights": ["亮点1", "亮点2"],
  "areas_for_growth": [
    {"priority": "高", "title": "建议标题", "detail": "具体建议"}
  ],
  "untested_dimensions": ["未测试维度1"]
}
[/ASSESSMENT_DATA]

**重要：soft_skills 必须完整输出所有 5 个维度**（personality/communication/work_style/leadership/learning），即使某维度分值较低也要给出 insights 和 evidence，不能省略。

不需要在 ASSESSMENT_DATA 中汇总 all_evidence，后端会自动从历史每轮 [ROUND_DATA] 中收集证据。

---

## 🧠 核心原则（刻在狐狸脑子里）

1. **每轮只做一件事**：基于系统给你的状态和任务，说一句漂亮话、问一个好问题
2. **不重复**：问过的问题不换个说法再问，聊透的维度不再纠缠
3. **有深度**：对方给细节就深挖，对方敷衍就换方向，别硬聊
4. **像朋友**：你不是 AI 考官，你是一只会聊天的小狐狸
5. **懂收手**：信息够了就结束，别贪多嚼不烂
6. **诚实记录**：对方不会的就是不会，别强行给分，untested 也是有效输出`;

// ===== 队长视角总结 Prompt（适配 V2 维度）=====
const LEADER_SUMMARY_PROMPT = `你是「Foxity」，现在以队长视角对成员进行客观评估。

## 队长视角总结模式
你需要以客观、直接的方式输出成员评估。

### 语气要求
- 客观、简洁，不用"嘿"、"我觉得"、"挺有意思的"等口语
- 不绕弯子，直接给出判断和依据
- 不评判这个人"好不好"，只描述"适合什么、不适合什么"
- 每条判断必须附带对话中的具体证据

### 硬技能维度（hard_skills）
- market_analysis：市场分析
- product_thinking：产品思维
- technical：技术能力
- business_finance：商业/财务
- design：设计能力

### 软实力维度（soft_skills）
- work_style：做事风格
- personality：性格特质
- learning：学习适应
- communication：沟通协作
- leadership：领导力

### status 可选值
- verified：已验证（有明确对话证据）
- unverified：待验证（有少量信息但不充分）
- untested：未涉及（对话中未提供足够证据）

### key_quotes 的选取规则
- 从对话记录中提取用户的原话，不是你自己总结的
- 每条 quote 不超过 80 字
- 每个维度最多 2 条 quote
- 选择最能证明该维度评分的那句话
- 如果该维度 untested，key_quotes 为空数组

### 证据的撰写规则
- 必须基于用户在对话中的实际回答
- 不能用泛泛的"表现良好"、"能力较强"
- 要写"用户在对话中描述了 X，使用了 Y 方法，达到了 Z 结果"
- 如果该维度 untested，写"对话中未提供足够证据"

### 输出格式（重要！必须严格输出 JSON，不要有其他文字）
{
  "leader_summary": {
    "hard_skills": [
      {
        "dimension": "market_analysis",
        "score": 8,
        "status": "verified",
        "summary": "能独立完成完整市场调研，框架感强",
        "evidence": "描述了完整调研项目，给出竞品对比框架，主动说明数据来源和边界",
        "key_quotes": ["我做过一个完整的市场调研，当时对比了三家竞品..."]
      }
    ],
    "soft_skills": [
      {
        "dimension": "work_style",
        "score": 8,
        "status": "verified",
        "summary": "计划性强，习惯先框架后细节",
        "evidence": "多次在截止日前完成高质量输出",
        "key_quotes": ["我一般会先把框架搭好，再往里面填内容..."]
      }
    ],
    "team_fit": {
      "suitable": ["市场分析", "竞品调研", "需要结构化思维的任务"],
      "not_suitable": ["需要大量技术实现的角色"],
      "notes": "在团队讨论中可能不够主动，需要有人主动询问他的意见"
    }
  }
}

请根据对话记录，对所有 5 个硬技能维度和 5 个软实力维度都给出评估。`;

// 解析 [ROUND_DATA] 标记，提取每轮结构化打标 JSON
// 即使结束标记缺失（截断），也绝不把 JSON 泄漏进回复文本
function parseRoundData(content: string): { reply: string; roundData: RoundDataParsed | null } {
  const startTag = content.indexOf("[ROUND_DATA]");
  if (startTag === -1) return { reply: content, roundData: null };
  const endTag = content.indexOf("[/ROUND_DATA]", startTag);

  const reply = content.slice(0, startTag).trim();
  const jsonStr = (
    endTag === -1
      ? content.slice(startTag + "[ROUND_DATA]".length)
      : content.slice(startTag + "[ROUND_DATA]".length, endTag)
  ).trim();
  try {
    const roundData = JSON.parse(jsonStr);
    return { reply, roundData };
  } catch {
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return { reply, roundData: JSON.parse(match[0]) };
      } catch {
        console.error("[chat] ROUND_DATA JSON parse error");
      }
    }
    return { reply, roundData: null };
  }
}

interface RoundDataParsed {
  round?: number;
  phase?: string;
  new_evidence?: Evidence[];
  self_assessment_signals?: SelfAssessmentSignal[];
  behavior_signals?: BehaviorSignal[];
  has_new_info?: boolean;
  dimensions_touched_this_round?: string[];
}

// 解析 [END_ASSESSMENT] / [ASSESSMENT_DATA] 标记
// 任一标记存在即视为画像轮；截断时同样保证回复文本干净
function parseAssessment(content: string): { reply: string; assessment: V2AssessmentData | null } {
  const endMarker = content.indexOf("[END_ASSESSMENT]");
  const dataStart = content.indexOf("[ASSESSMENT_DATA]");
  const firstMarker = endMarker === -1 ? dataStart : dataStart === -1 ? endMarker : Math.min(endMarker, dataStart);
  if (firstMarker === -1) return { reply: content, assessment: null };

  const reply = content.slice(0, firstMarker).trim();

  if (dataStart === -1) {
    return { reply, assessment: null };
  }

  const endTag = content.indexOf("[/ASSESSMENT_DATA]", dataStart);
  const jsonStr = (
    endTag === -1
      ? content.slice(dataStart + "[ASSESSMENT_DATA]".length)
      : content.slice(dataStart + "[ASSESSMENT_DATA]".length, endTag)
  ).trim();

  try {
    const assessment = JSON.parse(jsonStr);
    return { reply, assessment };
  } catch {
    // 尝试从文本中提取 JSON 对象
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const assessment = JSON.parse(match[0]);
        return { reply, assessment };
      } catch {
        console.error("[chat] assessment JSON parse error");
      }
    }
    return { reply, assessment: null };
  }
}

export async function POST(req: Request) {
  try {
    const { messages, viewer_role } = await req.json();

    // 清理历史消息：过滤掉空内容
    // Fox 消息优先使用 markup（含 [ROUND_DATA] 等标记），否则用 content（纯文本）
    // 这样 buildConversationState 和评分引擎都能从历史 assistant 消息中解析出每轮的结构化数据
    const cleanedMessages = (messages || [])
      .filter((msg: any) => msg && typeof msg.content === "string" && msg.content.trim().length > 0)
      .map((msg: any) => ({
        role: msg.role === "fox" || msg.role === "ai" ? "assistant" : "user",
        content: normalizeMarkers(
          ((msg.role === "fox" || msg.role === "ai") ? (msg.markup || msg.content) : msg.content) || ""
        ),
      }));

    const isLeaderMode = viewer_role === "leader";

    // ===== V3 状态驱动型 System Prompt：每轮注入当前状态和本轮任务 =====
    const systemPrompt = isLeaderMode
      ? `${LEADER_SUMMARY_PROMPT}\n\n以下是该成员与 Foxity 的完整对话记录，请基于此生成队长视角的评估：`
      : (() => {
          // 构建对话状态
          const state = buildConversationState(cleanedMessages);
          const plan = planRound(state);
          const stateBlock = formatStateForPrompt(state, plan);
          return `${SYSTEM_PROMPT_STATIC}\n\n---\n\n${stateBlock}`;
        })();

    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...cleanedMessages,
    ];

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: formattedMessages,
        temperature: isLeaderMode ? 0.3 : 0.85,
        max_tokens: isLeaderMode ? 4096 : 4096,
        response_format: isLeaderMode ? { type: "json_object" } : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", response.status, errorText);
      return NextResponse.json(
        { error: "API 请求失败", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    let content: string = data.choices?.[0]?.message?.content || "";
    content = normalizeMarkers(content.trim());

    // ===== 队长视角模式：返回 leader_summary JSON =====
    if (isLeaderMode) {
      // 清理 markdown 包裹
      if (content.startsWith("```")) {
        content = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      }
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch {
            parsed = { leader_summary: null };
          }
        } else {
          parsed = { leader_summary: null };
        }
      }
      return NextResponse.json({
        leader_summary: parsed.leader_summary || null,
      });
    }

    // ===== 对话模式：纯文本回复 + 可能的画像标记 =====
    // 先解析 [ROUND_DATA]（每轮结构化打标）
    const { reply: replyAfterRound, roundData } = parseRoundData(content);

    // 再解析 [END_ASSESSMENT] + [ASSESSMENT_DATA]
    const { reply, assessment } = parseAssessment(replyAfterRound);

    // 解析实时亮点标记 [HIGHLIGHT]...[/HIGHLIGHT]
    const highlights: string[] = [];
    const highlightRegex = /\[HIGHLIGHT\](.*?)\[\/HIGHLIGHT\]/g;
    let match;
    while ((match = highlightRegex.exec(reply)) !== null) {
      if (match[1]?.trim()) highlights.push(match[1].trim());
    }
    // 从回复中移除亮点标记（用户不可见）
    const cleanReply = reply.replace(highlightRegex, "").trim();

    // 重建带标记的原始内容（供下一轮 API 上下文使用）
    const markupParts: string[] = [cleanReply];
    if (highlights.length > 0) {
      for (const h of highlights) markupParts.push(`[HIGHLIGHT]${h}[/HIGHLIGHT]`);
    }
    if (roundData) {
      markupParts.push(`[ROUND_DATA]\n${JSON.stringify(roundData, null, 2)}\n[/ROUND_DATA]`);
    }
    const markup = markupParts.join("\n\n");

    // 情绪根据回复内容简单推断
    const inferEmotion = (text: string): string => {
      if (!text) return "thinking";
      if (/[?？]/.test(text) && /具体|例子|怎么|为什么/.test(text)) return "curious";
      if (/挑战|质疑|不太|真的吗|确定/.test(text)) return "challenge";
      if (/好|对|嗯哼|不错|厉害/.test(text)) return "nod";
      if (/惊讶|哇|哦？|没想到/.test(text)) return "surprised";
      if (/没关系|慢慢|别紧张|别急/.test(text)) return "encourage";
      if (/总结|画像|差不多了|了解了/.test(text)) return "serious";
      if (/开始|先说说|聊聊/.test(text)) return "smile";
      return "thinking";
    };

    // 出口兜底：无论解析结果如何，最终回复文本必须经过标记清洗
    // 模型偶尔不带标记直接吐 JSON，或标记被截断，这里统一剥离
    const replyText = sanitizeFoxReply(cleanReply) ||
      (roundData || assessment
        ? "嗯……Foxity 悄悄记了点笔记，我们继续聊吧 🦊"
        : sanitizeFoxReply(content));

    // ===== V3 评分引擎：从历史所有轮次收集证据并计算评分 =====
    let v3Scores: any = null;
    if (assessment) {
      try {
        // 从历史所有 assistant 消息中收集 ROUND_DATA
        const allEvidence: Evidence[] = [];
        const allSignals: SelfAssessmentSignal[] = [];
        const allBehavior: BehaviorSignal[] = [];

        for (const msg of cleanedMessages) {
          if (msg.role !== "assistant") continue;
          const { roundData: histRound } = parseRoundData(msg.content);
          if (histRound) {
            if (histRound.new_evidence) allEvidence.push(...histRound.new_evidence);
            if (histRound.self_assessment_signals) allSignals.push(...histRound.self_assessment_signals);
            if (histRound.behavior_signals) allBehavior.push(...histRound.behavior_signals);
          }
        }
        // 加入本轮的 ROUND_DATA
        if (roundData) {
          if (roundData.new_evidence) allEvidence.push(...roundData.new_evidence);
          if (roundData.self_assessment_signals) allSignals.push(...roundData.self_assessment_signals);
          if (roundData.behavior_signals) allBehavior.push(...roundData.behavior_signals);
        }

        // 兜底：如果 AI 没输出 ROUND_DATA，用 ASSESSMENT_DATA 的分数生成证据
        const HARD_DIMS = ["market_analysis", "product_thinking", "technical", "business_finance", "design"];
        const SOFT_DIMS = ["personality", "communication", "work_style", "leadership", "learning"];

        if (allEvidence.length === 0 && assessment.hard_skills) {
          // 硬技能 → Evidence
          for (const [dim, val] of Object.entries(assessment.hard_skills) as [string, any][]) {
            if (HARD_DIMS.includes(dim) && val?.score > 0) {
              allEvidence.push({
                dimension: dim,
                level: val.score >= 7 ? "L4" : val.score >= 4 ? "L3" : "L2",
                quality_score: val.score,
                summary: val.label || dim,
                quote: (val.evidence || [])[0] || "",
              });
            }
          }
        }
        if (allBehavior.length === 0 && assessment.soft_skills) {
          // 软技能 → BehaviorSignal（不污染硬技能评分）
          for (const [dim, val] of Object.entries(assessment.soft_skills) as [string, any][]) {
            if (SOFT_DIMS.includes(dim) && val?.score > 0) {
              allBehavior.push({
                dimension: dim as any,
                indicator: "fallback_from_assessment",
                polarity: val.score >= 6 ? "positive" : "neutral",
                strength: val.score / 10,
                description: val.label || dim,
              });
            }
          }
        }

        // 只要有证据或自述信号或行为信号，就计算评分
        // 这样即使无硬技能证据但有自述信号，self_scores 也能正常输出
        if (allEvidence.length > 0 || allSignals.length > 0 || allBehavior.length > 0) {
          v3Scores = aggregateScores(allEvidence, allSignals, allBehavior);
          (assessment as any).v3_score_data = {
            verified_scores: v3Scores.score_data.verified_scores,
            self_scores: v3Scores.score_data.self_scores,
            evidence_levels: v3Scores.score_data.evidence_levels,
          };
          (assessment as any).v3_credibility = v3Scores.credibility;
          (assessment as any).v3_type = v3Scores.type_result;
          (assessment as any).v3_soft_skills = v3Scores.soft_skill_scores.scores;
          console.log("[chat] V3 scoring:", {
            evidenceCount: allEvidence.length,
            signalCount: allSignals.length,
            behaviorCount: allBehavior.length,
            self_scores: v3Scores.score_data.self_scores,
            verified_scores: v3Scores.score_data.verified_scores,
          });
        } else {
          console.warn("[chat] V3 scoring skipped: no evidence/signals/behavior collected");
        }
      } catch (e) {
        console.error("[chat] V3 scoring engine error:", e);
      }
    }

    // 维度覆盖度（用于前端进度展示）
    const dimensionsCovered = roundData?.dimensions_touched_this_round?.length || 0;

    // 最终 markup：如果包含画像，把 [END_ASSESSMENT] 块也加回去
    let finalMarkup = markup;
    if (assessment) {
      finalMarkup = `${markup}\n\n[END_ASSESSMENT]\n[ASSESSMENT_DATA]\n${JSON.stringify(assessment, null, 2)}\n[/ASSESSMENT_DATA]`;
    }

    return NextResponse.json({
      reply: replyText,
      markup: finalMarkup,
      emotion: inferEmotion(replyText),
      content: replyText,
      expression: inferEmotion(replyText),
      is_final: !!assessment,
      assessment_data: assessment,
      highlights: highlights.length > 0 ? highlights : undefined,
      round_data: roundData,
      dimensions_covered: dimensionsCovered,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "服务器内部错误", details: error?.message },
      { status: 500 }
    );
  }
}

// V2 画像类型（本地使用）
type V2AssessmentData = {
  summary: string;
  hard_skills: Record<string, { score: number; label: string }>;
  soft_skills: Record<string, { score: number; label: string }>;
  tags: string[];
  soft_skill_narrative: string;
  highlights: string[];
  areas_for_growth: { priority: string; title: string; detail: string }[];
  untested_dimensions: string[];
  // V3 汇总字段（AI 在画像输出时附带）
  all_evidence?: Evidence[];
  all_self_assessment_signals?: SelfAssessmentSignal[];
  all_behavior_signals?: BehaviorSignal[];
  // V3 评分结果（后端引擎附加）
  v3_score_data?: {
    verified_scores: Record<string, number>;
    self_scores: Record<string, number>;
    evidence_levels: Record<string, string>;
  };
  v3_credibility?: any;
  v3_type?: any;
  v3_soft_skills?: any;
};
