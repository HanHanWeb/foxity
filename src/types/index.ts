// ===== V2 维度定义 =====

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Target,
  Code,
  Wallet,
  Palette,
  Brain,
  MessagesSquare,
  ListChecks,
  Crown,
  BookOpen,
  Search,
  Settings,
  Wrench,
  Lightbulb,
  Megaphone,
} from "lucide-react";

// 硬技能维度（5个）
export type HardSkillKey = "market_analysis" | "product_thinking" | "technical" | "business_finance" | "design";

export const hardSkillLabels: Record<HardSkillKey, string> = {
  market_analysis: "市场分析",
  product_thinking: "产品思维",
  technical: "技术能力",
  business_finance: "商业/财务",
  design: "设计能力",
};

export const hardSkillMeta: { key: HardSkillKey; icon: LucideIcon; name: string; shortName: string }[] = [
  { key: "market_analysis", icon: BarChart3, name: "市场分析", shortName: "市场" },
  { key: "product_thinking", icon: Target, name: "产品思维", shortName: "产品" },
  { key: "technical", icon: Code, name: "技术能力", shortName: "技术" },
  { key: "business_finance", icon: Wallet, name: "商业/财务", shortName: "财务" },
  { key: "design", icon: Palette, name: "设计能力", shortName: "设计" },
];

// 软实力维度（5个）
export type SoftSkillKey = "personality" | "communication" | "work_style" | "leadership" | "learning";

export const softSkillLabels: Record<SoftSkillKey, string> = {
  personality: "性格特质",
  communication: "沟通协作",
  work_style: "做事风格",
  leadership: "领导力",
  learning: "学习适应",
};

export const softSkillMeta: { key: SoftSkillKey; icon: LucideIcon; name: string; shortName: string }[] = [
  { key: "personality", icon: Brain, name: "性格特质", shortName: "性格" },
  { key: "communication", icon: MessagesSquare, name: "沟通协作", shortName: "沟通" },
  { key: "work_style", icon: ListChecks, name: "做事风格", shortName: "做事" },
  { key: "leadership", icon: Crown, name: "领导力", shortName: "领导" },
  { key: "learning", icon: BookOpen, name: "学习适应", shortName: "学习" },
];

// 12 型组合角色 → lucide 图标（渲染层映射；评分库里存的是 emoji 字符串数据契约）
export const twelveTypeIcons: Record<string, LucideIcon> = {
  "战略操盘手": Target,
  "洞察协调者": MessagesSquare,
  "深度研究员": Search,
  "思路萌芽者": BookOpen,
  "技术推动者": Settings,
  "落地搭档": Wrench,
  "极客工匠": Code,
  "快速成长者": Lightbulb,
  "商业掌舵人": Wallet,
  "资源联结者": Megaphone,
  "精算分析师": BarChart3,
  "商业感知者": Lightbulb,
};

// 全部 10 个维度
export type SkillKey = HardSkillKey | SoftSkillKey;

export const allSkillLabels: Record<SkillKey, string> = {
  ...hardSkillLabels,
  ...softSkillLabels,
};

// 兼容旧代码的别名
export type AbilityKey = HardSkillKey;
export const abilityLabels = hardSkillLabels;
export type DimensionStatus = "untested" | "in_progress" | "done";

// ===== 通用类型 =====

export type VerifyStatus = "verified" | "unverified" | "untested";
export type Expression = "smile" | "thinking" | "curious" | "challenge" | "nod" | "surprised" | "encourage" | "serious";

export interface Ability {
  score: number;
  verification_status: VerifyStatus;
  insights: string[];
  evidence_events: string[];
  self_score?: number;
}

// V2 画像数据结构（硬技能+软实力）
export type SkillScores = Record<HardSkillKey, number> & Partial<Record<SoftSkillKey, number>>;

// ===== V2 画像输出 =====

export interface V2SkillScore {
  score: number;
  label: string;
  insights?: string[];   // 该维度的洞察描述
  evidence?: string[];  // 该维度的证据事件（来自对话）
}

export interface V2KeywordTag {
  tag: string;
  confidence: "high" | "medium" | "low";
  evidence: string;
  category: string;
}

export interface V2AssessmentData {
  summary: string;
  hard_skills: Record<string, V2SkillScore>;
  soft_skills: Record<string, V2SkillScore>;
  tags: string[];
  keyword_tags?: V2KeywordTag[];
  soft_skill_narrative: string;
  highlights: string[];
  areas_for_growth: { priority: string; title: string; detail: string }[];
  untested_dimensions: string[];
}

// ===== 用户画像 =====

export interface UserProfile {
  user_id: string;
  user_name: string;
  team_id: string;
  team_name?: string;
  timestamp: string;
  core_positioning: string;
  overview_summary: string;
  abilities: Record<HardSkillKey, Ability>;       // 硬技能（兼容旧UI）
  soft_skills?: Record<SoftSkillKey, Ability>;     // 软实力
  behavior_patterns?: BehaviorPatterns;
  growth_suggestions: GrowthSuggestion[];
  tags?: string[];
  keyword_tags?: V2KeywordTag[];
  soft_skill_narrative?: string;
  highlights?: string[];
  leader_summary?: LeaderSummary;
  v2_assessment?: V2AssessmentData;               // V2 原始画像数据
  // V3 评分数据
  v3_score_data?: {
    verified_scores: Record<string, number>;
    self_scores: Record<string, number>;
    evidence_levels: Record<string, string>;
  };
  v3_credibility?: {
    overall: number | null;
    overall_level: string;
    dimensions: Record<string, { credibility: number | null; level: string; verified_score: number; self_score: number }>;
  };
  v3_type?: {
    primary_type: string;
    primary_icon: string;
    skill_orientation: string;
    behavior_pattern: string;
    secondary_types: string[];
    confidence: number;
  };
  v3_soft_skills?: Record<string, { score: number; evidence_count: number }>;
}

export interface BehaviorPatterns {
  stress_response: string;
  decision_style: string;
  collaboration_style: string;
  learning_style: string;
}

export interface GrowthSuggestion {
  area: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
}

// ===== 队长视角评估 =====

export interface LeaderSkillAssessment {
  dimension: HardSkillKey | SoftSkillKey;
  score: number;
  status: VerifyStatus;
  summary: string;
  evidence: string;
  key_quotes: string[];
}

export interface TeamFit {
  suitable: string[];
  not_suitable: string[];
  notes: string;
}

export interface LeaderSummary {
  hard_skills: LeaderSkillAssessment[];
  soft_skills: LeaderSkillAssessment[];
  team_fit: TeamFit;
}

// ===== 团队 =====

export interface Team {
  team_id: string;
  team_name: string;
  team_emoji?: string;
  competition_type: string;
  organizer_name: string;
  members: UserProfile[];
  created_at: string;
}

// ===== 聊天消息 =====

export interface ChatMessage {
  id?: string;
  role: "fox" | "user" | "ai";
  content: string;            // 用户看到的纯文本（无标记）
  markup?: string;            // Foxity 原始回复（含 [ROUND_DATA]/[HIGHLIGHT] 等标记），用于 API 上下文
  emotion?: Expression;
  expression?: Expression;
  timestamp: number | string;
  isTyping?: boolean;
  file?: { name: string; size: number; url: string };
  insights?: string[];
}

// ===== 测评状态 =====

export interface AssessmentState {
  current_expression: Expression;
  covered_dimensions: Record<HardSkillKey, DimensionStatus>;
  key_events: { stress: boolean; conflict: boolean };
  elapsed_minutes: number;
  insights: { icon: string; text: string }[];
}

// ===== AI 响应（V2：纯文本 + 画像标记）=====

export interface AIResponse {
  reply: string;              // 纯文本回复
  markup?: string;            // 原始回复（含 [ROUND_DATA]/[HIGHLIGHT]/[END_ASSESSMENT] 等标记），用于下一轮 API 上下文
  emotion: Expression;
  content: string;
  expression: Expression;
  is_final?: boolean;         // 是否包含画像输出
  profile_data?: Partial<UserProfile>;  // 解析后的画像
  assessment_data?: V2AssessmentData;   // V2 原始画像
  highlights?: string[];              // 实时亮点
  // V3 评分体系
  round_data?: {
    round?: number;
    phase?: string;
    new_evidence?: any[];
    self_assessment_signals?: any[];
    behavior_signals?: any[];
    has_new_info?: boolean;
    dimensions_touched_this_round?: string[];
  };
  dimensions_covered?: number;
}

export interface DimensionMeta {
  key: HardSkillKey;
  icon: LucideIcon;
  name: string;
  shortName: string;
}
