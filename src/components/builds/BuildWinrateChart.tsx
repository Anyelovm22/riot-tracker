import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Props = {
  labels: string[];
  percentages: number[];
  values: number[];
};

export default function BuildWinrateChart({ labels, percentages, values }: Props) {
  const chartData = labels.map((label, index) => ({
    label,
    winRate: percentages[index] || 0,
    games: values[index] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
        <XAxis dataKey="label" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" domain={[0, 100]} />
        <Tooltip
          formatter={(value: any, key: any) =>
            key === 'winRate' ? [`${value}%`, 'Win rate'] : [value, 'Partidas']
          }
          contentStyle={{
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.2)',
            background: '#0b1120',
          }}
        />
        <Bar dataKey="winRate" fill="#22d3ee" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
