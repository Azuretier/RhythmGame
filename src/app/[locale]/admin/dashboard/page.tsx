'use client';

import { useEffect, useState, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import {
  LineChart,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  Bar,
} from 'recharts';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailyRevenue {
  date: string;
  amount: number;
}

interface DailySignup {
  date: string;
  count: number;
}

interface FunnelEntry {
  step: string;
  count: number;
  conversionRate: number;
}

interface DashboardData {
  revenue: { total: number; daily: DailyRevenue[] };
  players: {
    dau: number;
    wau: number;
    mau: number;
    total: number;
    dailySignups: DailySignup[];
  };
  funnel: FunnelEntry[];
  marketing: {
    postsThisWeek: number;
    totalImpressions: number;
    engagementRate: number;
  };
}

type Range = '7d' | '30d' | '90d';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/40">{sub}</p>}
    </div>
  );
}

function TabTrigger({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'px-4 py-2 text-sm font-medium text-white/60 transition-colors',
        'border-b-2 border-transparent',
        'data-[state=active]:border-azure-500 data-[state=active]:text-white',
        'hover:text-white/80',
      )}
    >
      {children}
    </Tabs.Trigger>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [range, setRange] = useState<Range>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authKey, setAuthKey] = useState('');
  const [authed, setAuthed] = useState(false);

  // Check for admin key in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('azuretier_admin_key');
    if (stored) {
      setAuthKey(stored);
      setAuthed(true);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!authKey) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/analytics/dashboard?range=${range}`,
        { headers: { Authorization: `Bearer ${authKey}` } },
      );
      if (!res.ok) {
        if (res.status === 401) {
          setAuthed(false);
          localStorage.removeItem('azuretier_admin_key');
          setError('Invalid admin key');
        } else {
          setError(`Failed to fetch data (${res.status})`);
        }
        setData(null);
        return;
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [authKey, range]);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

  // -------------------------------------------------------------------------
  // Auth gate
  // -------------------------------------------------------------------------
  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (authKey.trim()) {
              localStorage.setItem('azuretier_admin_key', authKey.trim());
              setAuthed(true);
            }
          }}
          className="w-full max-w-sm space-y-4 rounded-lg border border-white/10 bg-white/5 p-6"
        >
          <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <input
            type="password"
            placeholder="Admin API Key"
            value={authKey}
            onChange={(e) => setAuthKey(e.target.value)}
            className="w-full rounded border border-white/20 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-azure-500 focus:outline-none"
          />
          <button
            type="submit"
            className="w-full rounded bg-azure-500 px-4 py-2 text-sm font-medium text-white hover:bg-azure-600 transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-white">
            Admin Dashboard
          </h1>

          <div className="flex items-center gap-2">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={cn(
                  'rounded px-3 py-1 text-xs font-medium transition-colors',
                  range === opt.value
                    ? 'bg-azure-500 text-white'
                    : 'bg-white/5 text-white/50 hover:text-white/80',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <p className="text-sm text-white/50">Loading dashboard data...</p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {data && (
          <Tabs.Root defaultValue="revenue">
            <Tabs.List className="flex gap-0 border-b border-white/10">
              <TabTrigger value="revenue">Revenue</TabTrigger>
              <TabTrigger value="players">Players</TabTrigger>
              <TabTrigger value="funnel">Funnel</TabTrigger>
              <TabTrigger value="marketing">Marketing</TabTrigger>
            </Tabs.List>

            {/* Revenue */}
            <Tabs.Content value="revenue" className="mt-6 space-y-6">
              <StatCard
                label="Total Revenue"
                value={`${data.revenue.total.toLocaleString()} JPY`}
              />
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="mb-4 text-sm font-medium text-white/60">
                  Daily Revenue
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.revenue.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: '#111',
                        border: '1px solid #333',
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: '#999' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#007FFF"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Tabs.Content>

            {/* Players */}
            <Tabs.Content value="players" className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="DAU" value={data.players.dau.toLocaleString()} />
                <StatCard label="WAU" value={data.players.wau.toLocaleString()} />
                <StatCard label="MAU" value={data.players.mau.toLocaleString()} />
                <StatCard label="Total" value={data.players.total.toLocaleString()} />
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="mb-4 text-sm font-medium text-white/60">
                  Daily Signups
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.players.dailySignups}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: '#111',
                        border: '1px solid #333',
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: '#999' }}
                    />
                    <Bar dataKey="count" fill="#007FFF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Tabs.Content>

            {/* Funnel */}
            <Tabs.Content value="funnel" className="mt-6 space-y-6">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="mb-4 text-sm font-medium text-white/60">
                  Conversion Funnel
                </p>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.funnel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="step"
                      stroke="#666"
                      tick={{ fontSize: 11 }}
                      width={130}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#111',
                        border: '1px solid #333',
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: '#999' }}
                      formatter={(value: number, name: string) =>
                        name === 'conversionRate'
                          ? [`${value}%`, 'Conversion']
                          : [value, 'Count']
                      }
                    />
                    <Bar
                      dataKey="count"
                      fill="#007FFF"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {data.funnel.map((f) => (
                  <StatCard
                    key={f.step}
                    label={f.step.replace(/_/g, ' ')}
                    value={f.count.toLocaleString()}
                    sub={`${f.conversionRate}% conversion`}
                  />
                ))}
              </div>
            </Tabs.Content>

            {/* Marketing */}
            <Tabs.Content value="marketing" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Posts This Week"
                  value={data.marketing.postsThisWeek}
                />
                <StatCard
                  label="Total Impressions"
                  value={data.marketing.totalImpressions.toLocaleString()}
                />
                <StatCard
                  label="Engagement Rate"
                  value={`${data.marketing.engagementRate.toFixed(1)}%`}
                />
              </div>
            </Tabs.Content>
          </Tabs.Root>
        )}
      </div>
    </div>
  );
}
