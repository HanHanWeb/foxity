# Foxity · 狐狸学长 🦊

> AI 像经验丰富的队长一样跟你聊 20 分钟，聊完告诉你——**"你在队里该待在什么位置"，以及"你没意识到的自己"。**

Foxity 是一个面向竞赛/项目团队的 **AI 对话式能力测评平台**。它不是把人工测评流程 AI 化的问卷工具，而是让 AI 发挥独有的能力：**动态判断、主动发现、跨域联想、实时挑战**。

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4) ![Turso](https://img.shields.io/badge/Database-Turso(libSQL)-ffec00) ![License](https://img.shields.io/badge/License-Apache--2.0-blue)

## ✨ 核心特性

### 对话式测评（AI 能动性驱动）

| 维度 | 通用 AI / 问卷式测评 | Foxity |
|------|---------------------|--------|
| 对话逻辑 | 固定流程，按题作答 | 松框架下 AI 自主决定聊什么、深挖什么、何时切换 |
| 软实力测法 | 直接问"你抗压能力如何" | 根据对话走向自然引出，不预设 |
| 意外发现 | 不会 | 捕捉用户无意间暴露的能力点，主动深挖 |
| 矛盾追问 | 不会 | 发现自评与表现矛盾时主动指出 |
| 挑战用户 | 只会迎合 | 有理有据地挑战用户的自我认知 |
| 画像生成 | 最后一次性输出 | 边聊边输出判断，最后整合成画像 |

### 五大组别能力分布

测评维度直接对齐竞赛项目书的实际结构，结果可以直接指导分工：

- 📊 **背景+市场组** —— 行业调研、竞品分析、文献综述、政策解读
- 🎯 **产品组** —— 需求洞察、方案设计、用户研究、产品思维
- 💻 **技术组** —— 技术方案、开发实现、架构理解、技术选型
- 💰 **财务组** —— 成本核算、财务预测、商业模式设计
- 🎨 **美工组** —— 视觉设计、PPT/UI 设计、品牌物料

一个人不必只属于一个组——AI 判断的是你在 5 个组别上的**能力分布**（例如"技术主攻 + 参与产品讨论"）。

### 评分引擎

个人画像由三层结构构成，配套本地评分引擎（`src/lib/scoring`）：

1. **你会什么** —— 五组别技能评分
2. **你怎么做事** —— 软实力推断（软实力维度评分）
3. **你不了解自己的什么** —— 自评-实测偏差校准 + AI 主动发现

评分过程带**可信度加权**（回答质量、细节丰富度影响最终分数），并输出 **12 型组合角色标签**（战略操盘手、极客工匠、商业掌舵人……）。

### 双视角产出

| 角色 | 看到什么 |
|------|---------|
| 👑 组织者/队长 | 全队能力矩阵、协作风格图谱、缺口诊断、分工建议 |
| 🧩 队员 | 个人能力定位卡、行为模式卡、自我认知校准 |

### 其他能力

- 🔗 **团队系统** —— 创建团队、邀请链接加入、成员管理；同一用户可在不同团队拥有不同画像
- 📄 **PDF 导出** —— 测评报告一键导出（jsPDF + html2canvas）
- 🔐 **账号安全** —— 邮箱验证码注册/登录（SMTP）、GeeTest 极验人机校验、Session 鉴权

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16（App Router）+ React 19 + TypeScript |
| UI | Tailwind CSS 4、shadcn/Radix UI、Framer Motion、Recharts、Lucide Icons |
| 状态管理 | Zustand |
| 数据库 | Turso（libSQL），服务端启动时自动建表 |
| AI | DeepSeek 对话模型（对话评测 + 结构化画像生成） |
| 认证 | Session Cookie + bcryptjs 密码哈希 + 邮箱验证码（Nodemailer SMTP）|
| 人机校验 | GeeTest 极验 |

## 🚀 快速开始

### 前置要求

- Node.js ≥ 20
- 一个 [Turso](https://turso.tech) 数据库
- DeepSeek 兼容 API Key
- SMTP 发信邮箱（用于注册验证码）
- GeeTest 极验凭证（可选）

### 安装与启动

```bash
git clone https://github.com/HanHanWeb/Foxity.git
cd foxity
npm install

# 在项目根目录创建 .env.local 并按下方表格配置环境变量

npm run dev
```

打开 http://localhost:3000 即可使用。服务器启动时会通过 `instrumentation.ts` 自动初始化数据库表结构，也可手动调用 `POST /api/db/init` 重建。

### 环境变量

在项目根目录创建 `.env.local`：

```bash
# ---------- 数据库 ----------
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token

# ---------- AI ----------
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_BASE_URL=https://aiping.cn/api/v1   # 可选，兼容 OpenAI 接口格式
DEEPSEEK_MODEL=DeepSeek-V4-Flash             # 可选

# ---------- 邮箱验证码 ----------
EMAIL_CODE_SECRET=your-signing-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=your@email.com
SMTP_PASS=your-smtp-password
SMTP_FROM="Foxity <your@email.com>"

# ---------- 人机校验 ----------
GEETEST_CAPTCHA_ID=your-captcha-id           # 未配置时注册可能不可用
GEETEST_CAPTCHA_KEY=your-captcha-key

# ---------- 站点 ----------
NEXT_PUBLIC_APP_URL=http://localhost:3000    # 用于生成团队邀请链接
```

## 📁 项目结构

```
src/
├── app/
│   ├── api/                  # 后端 API Routes
│   │   ├── auth/             # 注册 / 登录 / 登出 / 会话 / 验证码
│   │   ├── chat/             # AI 对话评测入口
│   │   ├── chat-history/     # 对话记录
│   │   ├── db/               # 数据库初始化
│   │   ├── profiles/         # 用户画像
│   │   └── teams/            # 团队创建 / 邀请 / 成员 / 分析 / 矩阵
│   ├── auth/                 # 登录 / 注册页
│   ├── chat/[teamId]/        # AI 测评对话页
│   ├── dashboard/            # 总览
│   ├── profile/[teamId]/     # 个人画像卡
│   └── team/[teamId]/        # 团队看板（队长）/ 成员详情等
├── components/               # Layout 与 shadcn/ui 组件
├── lib/
│   ├── scoring/              # 评分引擎：主引擎 / 软实力 / 可信度 / 12型角色
│   ├── ai.ts                 # AI 对话客户端
│   ├── team-analysis.ts      # 团队级分析与矩阵
│   ├── db.ts                 # Turso 客户端与建表语句
│   └── ...
└── store/                    # Zustand 全局状态
```

## 📄 开源协议

本项目基于 [Apache License 2.0](./LICENSE) 协议开源。
