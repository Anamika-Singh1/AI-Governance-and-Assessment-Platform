import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from "recharts";
import { DimensionAssessment } from "@/types/api";
import { DIMENSION_MAP } from "@/data/dimensions";
import { scoreColor } from "@/lib/riskColors";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function DimensionChart({ dimensions }: { dimensions: DimensionAssessment[] }) {
  const data = dimensions.map((d) => ({
    dimension: DIMENSION_MAP[d.dimension]?.shortLabel || d.dimension,
    fullLabel: DIMENSION_MAP[d.dimension]?.label || d.dimension,
    score: d.score
  }));

  return (
    <Tabs defaultValue="radar">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="radar">Radar</TabsTrigger>
          <TabsTrigger value="bar">Bar</TabsTrigger>
        </TabsList>
        <span className="text-xs text-slate-400 dark:text-slate-400">Each dimension scored 0–5 (5 = highest risk)</span>
      </div>
      <TabsContent value="radar">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={data} outerRadius="60%">
            <PolarGrid stroke="var(--chart-grid)" />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickCount={6} />
            <Radar dataKey="score" stroke="#2f5eff" fill="#2f5eff" fillOpacity={0.25} strokeWidth={2} />
            <Tooltip
              formatter={(value: any) => [`${value} / 5`, "Risk score"]}
              contentStyle={{ borderRadius: 8, fontSize: 12, borderColor: "var(--chart-grid)", backgroundColor: "var(--chart-surface)", color: "var(--chart-text)" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </TabsContent>
      <TabsContent value="bar">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
            <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
            <YAxis type="category" dataKey="dimension" width={90} tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
            <Tooltip
              formatter={(value: any) => [`${value} / 5`, "Risk score"]}
              contentStyle={{ borderRadius: 8, fontSize: 12, borderColor: "var(--chart-grid)", backgroundColor: "var(--chart-surface)", color: "var(--chart-text)" }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
              {data.map((d, i) => (
                <Cell key={i} fill={scoreColor(d.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </TabsContent>
    </Tabs>
  );
}
