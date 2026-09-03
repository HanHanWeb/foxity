"use client";

import { motion } from "framer-motion";
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface AbilityRadarItem {
  ability: string;
  label: string;
  score: number;
  verified: string;
}

interface AbilityRadarProps {
  data: AbilityRadarItem[];
  size?: number;
  fullWidth?: boolean;
}

export function AbilityRadar({ data, size = 280, fullWidth = false }: AbilityRadarProps) {
  const chartData = data.map((item) => ({
    label: item.label,
    score: item.verified === "untested" ? 0 : item.score,
    fullMark: 10,
  }));

  const containerStyle = fullWidth
    ? { width: "100%", height: 300 }
    : { width: size, height: size };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
      style={containerStyle}
      className="outline-none [&_svg]:outline-none [&_svg:focus]:outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart
          data={chartData}
          outerRadius="62%"
          margin={{ top: 14, right: 26, bottom: 14, left: 26 }}
        >
          <PolarGrid stroke="#E5E5E5" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "#2B4C7E", fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            name="能力分数"
            dataKey="score"
            stroke="#FF9F4D"
            fill="#FF9F4D"
            fillOpacity={0.35}
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #E5E5E5",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              outline: "none",
            }}
            wrapperStyle={{ outline: "none" }}
            cursor={false}
            formatter={(value) => [`${value}/10`, "分数"]}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
