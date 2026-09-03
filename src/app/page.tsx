"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  MessageCircle,
  Radar,
  Compass,
  Users,
  Loader2,
  Sparkles,
  BarChart3,
  Search,
  Layers,
  ShieldCheck,
  Calculator,
  TrendingUp,
  GitCompare,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { TextAnimate } from "@/components/ui/text-animate";
import { HomeNavbar } from "@/components/Layout/HomeNavbar";
import { JoinTeamDialog } from "@/components/JoinTeamDialog";
import { useAuth } from "@/lib/auth";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

function SectionHeading({ index, title, desc }: { index: string; title: string; desc?: string }) {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
      <div className="mb-4 flex items-center justify-center gap-3">
        <span className="rounded-full bg-[#f2aa72]/12 px-3.5 py-1 font-mono text-sm font-semibold tracking-widest text-[#f2aa72]">
          {index}
        </span>
      </div>
      <h2 className="text-balance text-3xl font-medium leading-tight tracking-tight text-[#425a7a] md:text-[40px]">
        {title}
      </h2>
      {desc && <p className="mt-4 text-pretty text-base leading-relaxed text-[#8a96aa] md:text-lg">{desc}</p>}
    </motion.div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth(false);
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-fox-gray" />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <HomeNavbar />
      <section className="relative flex min-h-screen items-center overflow-hidden bg-[#fbf7ef] py-28">
        <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-fox-orange/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-12 h-72 w-72 rounded-full bg-fox-mint/10 blur-3xl" />

        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-[1fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="group relative mb-12 flex w-fit items-center justify-center rounded-full py-1.5 pl-4 pr-5 shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f]">
              <span
                className="animate-gradient absolute inset-0 block h-full w-full rounded-[inherit] bg-gradient-to-r from-[#ff9f4d]/50 via-[#6bcb9f]/50 to-[#ff9f4d]/50 p-[1px]"
                style={{
                  backgroundSize: "300% 100%",
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "destination-out",
                  mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  maskComposite: "subtract",
                  WebkitClipPath: "padding-box",
                }}
              />
              <AnimatedGradientText
                className="text-sm font-semibold"
                colorFrom="#ff9f4d"
                colorTo="#6bcb9f"
              >
                全新 Foxity 已上线
              </AnimatedGradientText>
            </div>

            <h1 className="text-balance text-[44px] font-medium leading-[1.1] tracking-[-0.03em] text-[#425a7a] md:text-[64px]">
              <TextAnimate
                as="span"
                animation="blurInUp"
                by="character"
                duration={0.9}
                once
                className="block"
              >
                团队中的你，
              </TextAnimate>
              <TextAnimate
                as="span"
                animation="blurInUp"
                by="character"
                duration={1.2}
                delay={0.9}
                once
                className="block text-[#f2aa72]"
              >
                比你想象的更特别
              </TextAnimate>
            </h1>
            <p className="mt-8 text-lg font-medium text-[#9ca7b7] md:text-xl">
              携手 Foxity 共建团队，挖掘团队伙伴的专属闪光点。
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                onClick={() => setOpen(true)}
                className="h-12 min-w-[240px] rounded-full bg-fox-navy px-16 text-base font-semibold text-white shadow-lg shadow-[#425a7a]/15 hover:bg-fox-navy/90"
              >
                加入团队
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/team/create")}
                className="h-12 rounded-full border-[#d9dee8] bg-white/70 px-8 text-base font-semibold text-[#425a7a] shadow-sm hover:bg-white"
              >
                创建团队
              </Button>
            </div>

            <div className="mt-16 flex flex-wrap gap-4">
              {[
                { label: "自然对话", icon: <MessageCircle className="h-3.5 w-3.5" /> },
                { label: "十维能力", icon: <Radar className="h-3.5 w-3.5" /> },
                { label: "陪伴探索", icon: <Compass className="h-3.5 w-3.5" /> },
                { label: "团队视角", icon: <Users className="h-3.5 w-3.5" /> },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + idx * 0.15 }}
                  className="flex items-center gap-2 rounded-full border border-[#dfe4ec] bg-white/60 px-4 py-2 text-sm font-semibold text-[#8a96aa] shadow-sm backdrop-blur"
                >
                  {item.icon}
                  {item.label}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex min-h-[520px] items-center justify-center md:flex"
          >
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex h-[360px] w-[360px] items-center justify-center rounded-full bg-white shadow-[0_30px_80px_rgba(242,170,114,0.18)] lg:h-[420px] lg:w-[420px]"
            >
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-[220px] w-[220px] items-center justify-center rounded-full bg-[#fbf7ef] lg:h-[260px] lg:w-[260px]"
              >
                <motion.img
                  src="/fox.png"
                  alt="Foxity"
                  width={164}
                  height={164}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="rounded-3xl lg:h-[190px] lg:w-[190px]"
                />
              </motion.div>
            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-12 top-16 z-20 flex items-center gap-1.5 rounded-full bg-white/85 px-5 py-3 text-xs font-semibold text-[#8a96aa] shadow-lg shadow-[#425a7a]/5 backdrop-blur"
            >
              <MessageCircle className="h-3.5 w-3.5" /> 你其实挺会沟通的
            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute right-0 top-40 z-20 flex items-center gap-1.5 rounded-full bg-white/85 px-5 py-3 text-xs font-semibold text-[#8a96aa] shadow-lg shadow-[#425a7a]/5 backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5" /> 这里可能需要你
            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-20 left-16 z-20 flex items-center gap-1.5 rounded-full bg-white/85 px-5 py-3 text-xs font-semibold text-[#8a96aa] shadow-lg shadow-[#425a7a]/5 backdrop-blur"
            >
              <BarChart3 className="h-3.5 w-3.5" /> 团队分析 8/10
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================= Intro 01 · 工作原理 ================= */}
      <section className="bg-white py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            index="01"
            title="对话即测评，证据即评分"
            desc="没有表单，没有打分器。狐狸学长在与每位成员的自然对话中采集能力证据，逐条分级、加权、沉淀为画像。"
          />
          <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-4">
            {[
              {
                icon: <MessageCircle className="h-5 w-5" />,
                title: "自然对话",
                desc: "成员与 AI 自由畅聊项目经历，无题目、无压力，聊到哪测到哪。",
              },
              {
                icon: <Search className="h-5 w-5" />,
                title: "证据采集",
                desc: "每轮对话结束，AI 提炼结构化能力证据，并判定证据等级。",
              },
              {
                icon: <Layers className="h-5 w-5" />,
                title: "加权评分",
                desc: "按证据等级加权求均值，多条独立证据相互印证后得分趋稳。",
              },
              {
                icon: <Radar className="h-5 w-5" />,
                title: "画像生成",
                desc: "十维能力雷达 + 可信度评级 + 十二型角色，一键可导出 PDF。",
              },
            ].map((item, idx) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative rounded-3xl border border-[#e8ecf3] bg-[#fbf7ef]/60 p-6 transition-shadow duration-300 hover:shadow-[0_16px_40px_rgba(66,90,122,0.08)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fox-orange/15 text-[#f2aa72]">
                  {item.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#425a7a]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#8a96aa]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= Intro 02 · 证据分级加权 ================= */}
      <section className="bg-[#fbf7ef] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            index="02"
            title="不是所有话，都值得采信"
            desc="每条对话证据都会被划入 L0–L5 六个等级：等级越高、采信越多；自己夸自己的，一律不计。"
          />
          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="space-y-3">
              {[
                { level: "L5", label: "多源确认", weight: 1.2, desc: "聊了好几轮，结论都对得上", accent: "#6bcb9f" },
                { level: "L4", label: "行为佐证", weight: 1.0, desc: "有具体行动，也有可查的结果", accent: "#5eb894" },
                { level: "L3", label: "交叉验证", weight: 0.7, desc: "不同话题里都提到了，互相对得上", accent: "#f2aa72" },
                { level: "L2", label: "间接线索", weight: 0.4, desc: "只提过一次，先参考着", accent: "#f5c096" },
                { level: "L1", label: "自我声称", weight: 0, desc: "「我特别擅长 XX」——说了不算", accent: "#dfe4ec" },
                { level: "L0", label: "无证据", weight: 0, desc: "还没聊到这一块", accent: "#eceff4" },
              ].map((row, idx) => (
                <motion.div
                  key={row.level}
                  {...fadeUp}
                  transition={{ duration: 0.45, delay: idx * 0.06 }}
                  className="flex items-center gap-4 rounded-2xl border border-[#e8ecf3] bg-white px-5 py-4 shadow-sm"
                >
                  <span className="w-10 shrink-0 font-mono text-sm font-bold" style={{ color: row.weight > 0 ? row.accent : "#b6bfcd" }}>
                    {row.level}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-[#425a7a]">{row.label}</span>
                      <span className="font-mono text-xs font-semibold text-[#8a96aa]">
                        {row.weight > 0 ? `× ${row.weight.toFixed(1)}` : "不计分"}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f0f2f6]">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(row.weight / 1.2) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 + idx * 0.06, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: row.accent }}
                      />
                    </div>
                    <p className="mt-1.5 truncate text-xs text-[#a8b2c2]">{row.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="rounded-3xl bg-[#425a7a] p-7 text-white shadow-xl shadow-[#425a7a]/15 md:p-9"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Calculator className="h-5 w-5 text-[#ffd93d]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">看一次真实演算</h3>
                  <p className="mt-0.5 text-xs text-[#9db1cc]">三句话，两种命运</p>
                </div>
              </div>

              <div className="mt-7 space-y-4">
                {[
                  {
                    text: "上次迭代我负责登录模块重构，上线后报错率降到了 0.1%",
                    tag: "L4 · 行为佐证",
                    score: "8 分",
                    color: "#6bcb9f",
                  },
                  {
                    text: "我 JavaScript 挺强的",
                    tag: "L1 · 自我声称",
                    score: "不计分",
                    color: "#9db1cc",
                  },
                  {
                    text: "落地页改版是我做的，转化率提了 15%",
                    tag: "L4 · 行为佐证",
                    score: "7 分",
                    color: "#6bcb9f",
                  },
                ].map((msg, idx) => (
                  <motion.div
                    key={msg.text}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: 0.25 + idx * 0.15 }}
                    className="flex flex-col items-end gap-1"
                  >
                    <div className="max-w-[88%] rounded-2xl rounded-br-md bg-white/95 px-4 py-2.5 text-sm leading-relaxed text-[#425a7a] shadow-sm">
                      {msg.text}
                    </div>
                    <p className="pr-1 text-[11px] font-medium" style={{ color: msg.color }}>
                      {msg.tag}
                      <span className="ml-1.5 font-mono font-semibold">{msg.score}</span>
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-7 space-y-2 rounded-2xl bg-white/[0.06] px-5 py-4 text-sm text-[#c9d6e8]">
                <p>
                  两条 L4 证据，加权平均 → <span className="font-semibold text-white">7.5</span>
                </p>
                <p>
                  证据只有两条，先打八折 → <span className="font-semibold text-[#ffd93d]">6.0</span>
                </p>
                <p className="pt-1 text-xs text-[#9db1cc]">「我挺强的」？一个字都没算进去。</p>
              </div>

              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-[#9db1cc]">最终验证分</p>
                  <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-white">6.0</p>
                </div>
                <p className="text-right text-[11px] leading-relaxed text-[#9db1cc]">
                  证据越少折扣越大
                  <br />
                  四条起才不打折
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5 text-[11px] text-[#9db1cc]">
                <span>证据条数折扣</span>
                {["1 条 ×0.7", "2 条 ×0.8", "3 条 ×0.9", "4 条起 ×1.0"].map((c) => (
                  <span key={c} className="rounded-full bg-white/[0.08] px-2.5 py-1 font-mono">
                    {c}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= Intro 03 · 双轨评分与可信度 ================= */}
      <section className="bg-white py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            index="03"
            title="双轨评分，专治吹牛"
            desc="每个能力维度同时记录两条分轨：经证据验证的「验证分」与对话中流露的「自述分」。二者的比值，就是可信度。"
          />
          <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border border-[#e8ecf3] bg-[#fbf7ef]/60 p-7"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6bcb9f]/15 text-[#4ea87e]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[#425a7a]">验证分 · 铁轨</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#8a96aa]">
                只由 L2 及以上等级证据加权得出。每一条都能追溯到具体对话轮次，队长可逐条复核证据原文。
              </p>
              <p className="mt-4 font-mono text-xs text-[#4ea87e]">verified_score</p>
            </motion.div>
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-3xl border border-[#e8ecf3] bg-[#fbf7ef]/60 p-7"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f2aa72]/15 text-[#f2aa72]">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[#425a7a]">自述分 · 橡皮轨</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#8a96aa]">
                AI 从「我负责过」「我擅长」等自述信号中估算的自我认知分。它不决定能力，只用来对照。
              </p>
              <p className="mt-4 font-mono text-xs text-[#f2aa72]">self_estimated_score</p>
            </motion.div>
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-3xl bg-[#425a7a] p-7 text-white shadow-xl shadow-[#425a7a]/15"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <GitCompare className="h-5 w-5 text-[#ffd93d]" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">可信度 = 验证 ÷ 自述</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#c9d6e8]">
                比值 ≥ 1 说明实力超出自评，比值过低则说明「注水」。五档评级直接写进画像。
              </p>
              <p className="mt-4 font-mono text-xs text-[#ffd93d]">credibility_ratio</p>
            </motion.div>
          </div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-10 rounded-3xl border border-[#e8ecf3] bg-white p-6 shadow-sm md:p-8"
          >
            <div className="flex h-12 gap-1.5 overflow-hidden">
              {[
                { grade: "S", label: "低调实力派", tip: "实际能力超出自评", ratio: 1.0, color: "#6bcb9f" },
                { grade: "A", label: "诚实靠谱", tip: "自评准确可信", ratio: 0.8, color: "#5eb894" },
                { grade: "B", label: "略有美化", tip: "多数人在此区间", ratio: 0.6, color: "#f2aa72" },
                { grade: "C", label: "明显夸大", tip: "关键任务需验证", ratio: 0.4, color: "#ef8354" },
                { grade: "D", label: "严重注水", tip: "核心角色勿分配", ratio: 0, color: "#e15b64" },
              ].map((g, idx, arr) => {
                const left = idx === 0 ? 0 : 1 - arr[idx - 1].ratio;
                const right = idx === arr.length - 1 ? 0 : 1 - g.ratio;
                return (
                  <motion.div
                    key={g.grade}
                    initial={{ opacity: 0, scaleY: 0.4 }}
                    whileInView={{ opacity: 1, scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeOut" }}
                    style={{ flexGrow: left + right || 1, background: g.color }}
                    className="flex items-center justify-center rounded-full font-mono text-base font-bold text-white"
                  >
                    {g.grade}
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between font-mono text-[11px] font-semibold text-[#b6bfcd]">
              <span>可信度 1.0</span>
              <span>0.8</span>
              <span>0.6</span>
              <span>0.4</span>
              <span>0</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { grade: "S", label: "低调实力派", tip: "实际能力超出自评", color: "#6bcb9f" },
                { grade: "A", label: "诚实靠谱", tip: "自评准确可信", color: "#5eb894" },
                { grade: "B", label: "略有美化", tip: "多数人在此区间", color: "#f2aa72" },
                { grade: "C", label: "明显夸大", tip: "关键任务需验证", color: "#ef8354" },
                { grade: "D", label: "严重注水", tip: "核心角色勿分配", color: "#e15b64" },
              ].map((g) => (
                <div key={g.grade} className="flex items-center gap-2.5">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold text-white"
                    style={{ background: g.color }}
                  >
                    {g.grade}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#425a7a]">{g.label}</p>
                    <p className="truncate text-[11px] text-[#a8b2c2]">{g.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= Intro 04 · 十二型角色矩阵 ================= */}
      <section className="bg-[#fbf7ef] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            index="04"
              title="十二型角色，一图对号入座"
              desc="硬技能群 × 行为模式，两个坐标一交叉，就是你在团队里的生态位。"
          />
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5 }}
            className="mt-16 overflow-hidden rounded-3xl border border-[#e8ecf3] bg-white shadow-sm"
          >
            <div className="grid grid-cols-[4.5rem_repeat(3,1fr)] border-b border-[#eef1f6] bg-[#fbf7ef]/70 px-6 py-4 text-xs font-semibold text-[#8a96aa] md:text-sm">
              <span />
              <span className="flex items-center gap-1.5 px-3 py-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-[#f2aa72]" /> 分析型
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5">
                <Layers className="h-3.5 w-3.5 text-[#6bcb9f]" /> 执行型
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-[#4ea87e]" /> 商业型
              </span>
            </div>
            {[
              { pattern: "主导", note: "推动与决断", cells: ["战略操盘手", "技术推动者", "商业掌舵人"] },
              { pattern: "协作", note: "联结与共识", cells: ["洞察协调者", "落地搭档", "资源联结者"] },
              { pattern: "独立", note: "深耕与专注", cells: ["深度研究员", "极客工匠", "精算分析师"] },
              { pattern: "成长", note: "学习力优先", cells: ["思路萌芽者", "快速成长者", "商业感知者"] },
            ].map((row, rIdx) => (
              <div
                key={row.pattern}
                className={`grid grid-cols-[4.5rem_repeat(3,1fr)] items-center px-6 py-4 ${
                  rIdx < 3 ? "border-b border-[#eef1f6]" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-[#425a7a] md:text-base">{row.pattern}</p>
                  <p className="mt-0.5 hidden text-[11px] text-[#a8b2c2] md:block">{row.note}</p>
                </div>
                {row.cells.map((cell, cIdx) => (
                  <motion.div
                    key={cell}
                    {...fadeUp}
                    transition={{ duration: 0.4, delay: (rIdx * 3 + cIdx) * 0.04 }}
                    className={`mx-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold md:text-sm ${
                      rIdx === 0
                        ? "bg-[#f2aa72]/10 text-[#d98a45]"
                        : rIdx === 1
                          ? "bg-[#6bcb9f]/10 text-[#4ea87e]"
                          : rIdx === 2
                            ? "bg-[#425a7a]/8 text-[#425a7a]"
                            : "bg-[#ffd93d]/15 text-[#b8932a]"
                    }`}
                  >
                    <Fingerprint className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    {cell}
                  </motion.div>
                ))}
              </div>
            ))}
          </motion.div>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-8 max-w-xl text-center text-sm text-[#a8b2c2]"
          >
            硬技能群由「市场分析 · 产品思维」「技术 · 设计」「商业财务」三组验证分聚类得出，行为模式由领导力、沟通、做事风格与学习力综合判定。
          </motion.p>
        </div>
      </section>

      <JoinTeamDialog open={open} onOpenChange={setOpen} />

      <footer className="flex flex-col items-center gap-2 bg-[#fbf7ef] py-8">
        <p className="text-xs text-fox-gray">NextStep 2026 武汉站参赛项目</p>
        <div className="flex items-center gap-1.5 text-fox-gray">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M17.7 4.27c1.36.44 2.18 1.14 2.62 1.95.44.82.5 1.78.32 2.76-.35 1.96-1.72 4.02-3.16 5.7l-.24.28-1.02-1.5.15-.2c1.34-1.9 2.32-3.87 2.32-5.28 0-.43-.1-.77-.3-1.02-.2-.25-.54-.46-1.06-.6l.37-2.09zM9.06 14.15l1.53 1.53-2.4 2.4a4.29 4.29 0 0 1-1.9 1.1c-.66.18-1.4.2-2.13.07l1.9-1.9.85-.85 1.06-1.06 1.09-1.29zm3.37-11.2l1.54 1.53-8.72 9.77-2.77 5.4a.35.35 0 0 0 .47.46l5.4-2.78 5.72-5.7 3.1 3.1a.87.87 0 0 1 .25.62.87.87 0 0 1-.26.62l-.62.62-1.85-.37-.37 1.85-.62.62a.87.87 0 0 1-.62.26.87.87 0 0 1-.62-.25l-3.1-3.1-1.06 1.06.85.85-1.9 1.9a4.5 4.5 0 0 1-2.12.07 4.5 4.5 0 0 1-1.87-1.11 4.29 4.29 0 0 1-1.1-1.9 4.5 4.5 0 0 1-.08-2.12l1.9-1.9.86.85 1.06-1.06-3.1-3.1a.87.87 0 0 1-.25-.62c0-.24.1-.46.26-.62l.62-.62 1.85-.37.37-1.85.62-.62a.87.87 0 0 1 .62-.26c.24 0 .46.1.62.25l3.1 3.1 2.6-2.6-1.53-1.54.62-2.06 2.06-.62z" />
          </svg>
          <span className="text-xs">Apache-2.0 License</span>
        </div>
      </footer>
    </main>
  );
}
