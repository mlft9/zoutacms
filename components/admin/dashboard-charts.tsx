"use client";

import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface RegistrationDataPoint {
  date: string;
  count: number;
}

interface TypeDataPoint {
  type: string;
  count: number;
}

interface StatusDataPoint {
  status: string;
  count: number;
}

const TYPE_COLORS: Record<string, string> = {
  VPS: "#3b82f6",
  MINECRAFT: "#10b981",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10b981",
  SUSPENDED: "#f59e0b",
  PENDING: "#6366f1",
  TERMINATED: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  PENDING: "En attente",
  TERMINATED: "Résilié",
};

export function RegistrationsChart({ data }: { data: RegistrationDataPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        Aucune inscription sur les 30 derniers jours
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => v.slice(5)} // MM-DD
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          formatter={(value) => [value ?? 0, "Inscriptions"]}
          labelFormatter={(label) => `Date : ${label}`}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#colorCount)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ServicesByTypeChart({ data }: { data: TypeDataPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        Aucun service
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="type"
          cx="50%"
          cy="50%"
          outerRadius={65}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={(props: any) =>
            `${props.type} ${((props.percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell key={entry.type} fill={TYPE_COLORS[entry.type] ?? "#94a3b8"} />
          ))}
        </Pie>
        <Legend formatter={(value) => value} />
        <Tooltip formatter={(value) => [value ?? 0, "Services"]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ServicesByStatusChart({ data }: { data: StatusDataPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        Aucun service
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={65}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={(props: any) =>
            `${STATUS_LABELS[props.status as string] ?? props.status} ${((props.percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
          ))}
        </Pie>
        <Legend formatter={(value) => STATUS_LABELS[value] ?? value} />
        <Tooltip
          formatter={(value, name) => [value ?? 0, STATUS_LABELS[String(name)] ?? String(name)]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
