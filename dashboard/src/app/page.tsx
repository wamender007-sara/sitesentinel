'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Globe2, 
  Send, 
  Languages, 
  ExternalLink,
  Search,
  RefreshCw,
  Cpu,
  Clock,
  Radio,
  Zap,
  Check,
  ChevronRight,
  Code2,
  Terminal,
  Layers,
  Sparkles,
  ArrowUpRight,
  SlidersHorizontal,
  Mail,
  Lock,
  Workflow,
  CheckCircle,
  Copy,
  Settings,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { fetchApi } from '../lib/api';
import { translations, Language, SUPPORTED_LANGUAGES } from '../lib/i18n';

// ── Pastel Color Palette ─────────────────────────────────────────────────────
const PASTEL = {
  rose: { bg: 'bg-[#fff1f2]', text: 'text-[#e11d48]', border: 'border-[#fecdd3]', bar: '#fb7185' },
  peach: { bg: 'bg-[#fff7ed]', text: 'text-[#c2410c]', border: 'border-[#fed7aa]', bar: '#fb923c' },
  honey: { bg: 'bg-[#fefce8]', text: 'text-[#a16207]', border: 'border-[#fef08a]', bar: '#facc15' },
  sky: { bg: 'bg-[#f0f9ff]', text: 'text-[#0369a1]', border: 'border-[#bae6fd]', bar: '#38bdf8' },
  mint: { bg: 'bg-[#ecfdf5]', text: 'text-[#047857]', border: 'border-[#a7f3d0]', bar: '#34d399' },
  lavender: { bg: 'bg-[#f5f3ff]', text: 'text-[#6d28d9]', border: 'border-[#ddd6fe]', bar: '#a78bfa' },
};

export default function Dashboard() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang] || translations.en;

  // Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'review' | 'sites' | 'issues' | 'scan' | 'automation'>('overview');
  
  // Settings modal
  const [showSettings, setShowSettings] = useState(false);

  // Data state
  const [stats, setStats] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Scan state
  const [scanUrl, setScanUrl] = useState('http://localhost:4000/');
  const [scanning, setScanning] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const [scanResult, setScanResult] = useState<any>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Review state
  const [editingBodies, setEditingBodies] = useState<Record<string, string>>({});
  const [nativeReportPreview, setNativeReportPreview] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, sitesRes, issuesRes, reportsRes] = await Promise.all([
        fetchApi('/stats').catch(() => null),
        fetchApi('/sites').catch(() => []),
        fetchApi('/issues').catch(() => []),
        fetchApi('/reports/pending').catch(() => []),
      ]);

      if (statsRes) setStats(statsRes);
      setSites(sitesRes || []);
      setIssues(issuesRes || []);
      setPendingReports(reportsRes || []);

      if (reportsRes && reportsRes.length > 0 && !selectedReportId) {
        setSelectedReportId(reportsRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (issueId: string) => {
    try {
      await fetchApi(`/issues/${issueId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          approved_by: 'QA Sentinel Lead',
          report_body: editingBodies[issueId] || undefined,
        }),
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#fbbf24']
      });

      loadData();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleReject = async (issueId: string) => {
    try {
      await fetchApi(`/issues/${issueId}/reject`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    }
  };

  const handleTriggerScan = async (targetUrl?: string) => {
    const url = targetUrl || scanUrl;
    setScanning(true);
    setScanStage(1);
    setScanResult(null);

    const s1 = setTimeout(() => setScanStage(2), 1100);
    const s2 = setTimeout(() => setScanStage(3), 2200);

    try {
      const res = await fetchApi('/scans', {
        method: 'POST',
        body: JSON.stringify({ url, autoAnalyze: true }),
      });
      setScanStage(4);
      setScanResult(res);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#34d399', '#38bdf8', '#a78bfa']
      });

      loadData();
    } catch (err: any) {
      setScanResult({ error: err.message });
    } finally {
      clearTimeout(s1);
      clearTimeout(s2);
      setTimeout(() => {
        setScanning(false);
        setScanStage(0);
      }, 1400);
    }
  };

  // Severity data for chart
  const severityChartData = [
    { name: 'Critical', count: issues.filter(i => i.severity === 'critical').length, fill: PASTEL.rose.bar },
    { name: 'High', count: issues.filter(i => i.severity === 'high').length, fill: PASTEL.peach.bar },
    { name: 'Medium', count: issues.filter(i => i.severity === 'medium').length, fill: PASTEL.honey.bar },
    { name: 'Low', count: issues.filter(i => i.severity === 'low').length, fill: PASTEL.sky.bar },
  ];

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesSev = severityFilter === 'all' || issue.severity === severityFilter;
      const matchesType = typeFilter === 'all' || issue.type === typeFilter;
      const matchesQuery = searchQuery === '' ||
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSev && matchesType && matchesQuery;
    });
  }, [issues, severityFilter, typeFilter, searchQuery]);

  // Active selected report in Review tab
  const activeReport = pendingReports.find(r => r.id === selectedReportId) || pendingReports[0] || null;

  const avgHealth = stats?.averageHealthScore ?? (sites.length > 0 ? Math.round(sites.reduce((acc, s) => acc + (s.health_score || 0), 0) / sites.length) : 100);

  const currentLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfcfd] text-slate-800 antialiased font-sans">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 via-sky-400 to-teal-300 flex items-center justify-center text-white shadow-sm shadow-indigo-100">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900">{t.appTitle}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Center Nav Pills (Clean, No-Overlap, Whitespace-Nowrap) */}
        <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-inner overflow-x-auto max-w-2xl">
          {[
            { id: 'overview', icon: Activity, label: t.overview },
            { id: 'review', icon: FileText, label: t.reviewQueue, badge: pendingReports.length },
            { id: 'sites', icon: Globe2, label: t.sites, count: sites.length },
            { id: 'issues', icon: AlertTriangle, label: t.issues, count: issues.length },
            { id: 'scan', icon: Send, label: t.newScan },
            { id: 'automation', icon: Workflow, label: t.automation },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-rose-100 text-rose-700 animate-pulse">
                    {tab.badge}
                  </span>
                )}
                {tab.count !== undefined && !tab.badge && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Tools: Settings Gear & Sync Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Settings Button (Language & Preferences) */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 transition shadow-sm"
            title={t.settings}
          >
            <span className="text-sm">{currentLangInfo.flag}</span>
            <span className="hidden sm:inline font-mono">{currentLangInfo.nativeName}</span>
            <Settings className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Sync Button */}
          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Settings Modal (Language & Regional Customization) ───────────── */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg bg-white rounded-3xl p-7 shadow-2xl border border-slate-100 space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
                    <Languages className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{t.language}</h3>
                    <p className="text-xs text-slate-400">{t.languageDesc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Languages Grid (English + Tamil + Malayalam + Telugu + Kannada + Hindi) */}
              <div className="grid grid-cols-2 gap-3">
                {SUPPORTED_LANGUAGES.map((item) => {
                  const isCurrent = lang === item.code;
                  return (
                    <button
                      key={item.code}
                      onClick={() => {
                        setLang(item.code);
                      }}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                        isCurrent 
                          ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-200' 
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{item.flag}</span>
                        <div>
                          <p className="font-bold text-xs text-slate-900">{item.nativeName}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{item.label}</p>
                        </div>
                      </div>
                      {isCurrent && (
                        <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  SiteSentinel Regional Multi-Lingual Core
                </span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Main Canvas ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-8">
        <AnimatePresence mode="wait">
          {/* ════ 1. OVERVIEW VIEW ═══════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Top Banner: Rule 4 Human-in-the-Loop Guarantee */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 rounded-3xl bg-gradient-to-r from-indigo-50/70 via-sky-50/50 to-teal-50/40 border border-indigo-100/80 shadow-sm gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 flex-shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 tracking-tight">{t.rule4Title}</h4>
                    <p className="text-[11px] text-slate-500">{t.rule4Notice}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                  <button
                    onClick={() => setActiveTab('review')}
                    className="text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 px-3.5 py-1.5 rounded-xl border border-indigo-200 shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>{pendingReports.length} {t.pendingApprovals}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bento Grid: 4 Pastel KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Global Health Index */}
                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.avgHealth}</span>
                    <span className="p-2 rounded-2xl bg-emerald-50 text-emerald-600">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className={`text-4xl font-extrabold tracking-tight font-mono ${
                      avgHealth >= 80 ? 'text-emerald-600' : avgHealth >= 50 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {avgHealth}
                    </span>
                    <span className="text-sm font-bold text-slate-400">/ 100</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50/80 px-2.5 py-1 rounded-xl w-fit">
                    <Check className="w-3.5 h-3.5" /> {avgHealth >= 80 ? 'Grade A' : 'Grade C'}
                  </div>
                </div>

                {/* 2. Monitored Sites */}
                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.totalSites}</span>
                    <span className="p-2 rounded-2xl bg-sky-50 text-sky-600">
                      <Globe2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight font-mono text-slate-900">
                      {stats?.totalSites ?? sites.length}
                    </span>
                    <span className="text-xs font-bold text-slate-400">allowlisted</span>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 font-medium">Targets enrolled in daily audits</p>
                </div>

                {/* 3. Open Issues */}
                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.openIssues}</span>
                    <span className="p-2 rounded-2xl bg-amber-50 text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight font-mono text-amber-600">
                      {stats?.openIssues ?? issues.length}
                    </span>
                    <span className="text-xs font-bold text-slate-400">flaws</span>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 font-medium">Deduplicated via SHA-256</p>
                </div>

                {/* 4. Critical Issues */}
                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.criticalIssues}</span>
                    <span className="p-2 rounded-2xl bg-rose-50 text-rose-600">
                      <XCircle className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight font-mono text-rose-600">
                      {stats?.criticalIssues ?? issues.filter(i => i.severity === 'critical').length}
                    </span>
                    <span className="text-xs font-bold text-slate-400">critical</span>
                  </div>
                  <p className="mt-3 text-[11px] text-rose-600 font-semibold">Immediate attention advised</p>
                </div>
              </div>

              {/* Main Grid: Clean Bar Chart + Fast Launcher */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Clean Severity Bar Chart (Zero Overlap!) */}
                <div className="lg:col-span-7 p-7 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">Flaw Distribution by Severity</h3>
                      <p className="text-xs text-slate-400">Categorized from Playwright heuristic inspection passes</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                      Live Telemetry
                    </span>
                  </div>

                  <div className="h-64 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={severityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#94a3b8" 
                          tick={{ fontSize: 12, fill: '#64748b' }} 
                          axisLine={{ stroke: '#e2e8f0' }}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          allowDecimals={false} 
                          tick={{ fontSize: 12, fill: '#64748b' }} 
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(241, 245, 249, 0.7)', radius: 8 }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-200/80 text-xs">
                                  <p className="font-bold text-slate-800">{label}</p>
                                  <p className="text-slate-500 font-medium mt-0.5">
                                    Flaws Detected: <span className="font-bold text-indigo-600 font-mono text-sm">{payload[0].value}</span>
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" radius={[10, 10, 0, 0]} maxBarSize={48}>
                          {severityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Quick Audit Launcher Card */}
                <div className="lg:col-span-5 p-7 rounded-3xl bg-gradient-to-br from-white via-indigo-50/20 to-sky-50/30 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                      <Zap className="w-4 h-4 fill-indigo-600" />
                      <span>Instant Audit Launcher</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Run Live Heuristic Scan</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Launches an automated Playwright headless instance with console, broken-link, meta, and WCAG AA contrast probes.
                    </p>
                  </div>

                  {/* Input & Quick Presets */}
                  <div className="space-y-3">
                    <div>
                      <input
                        type="url"
                        value={scanUrl}
                        onChange={(e) => setScanUrl(e.target.value)}
                        placeholder="http://localhost:4000/"
                        className="w-full text-xs font-mono bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-[11px]">Quick Target:</span>
                      <button
                        onClick={() => setScanUrl('http://localhost:4000/')}
                        className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl transition"
                      >
                        localhost:4000 (Testbed)
                      </button>
                    </div>

                    <button
                      onClick={() => handleTriggerScan()}
                      disabled={scanning}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-500 hover:from-indigo-700 hover:to-teal-600 text-white font-bold text-xs shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {scanning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{t.scanning}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>{t.startScan}</span>
                        </>
                      )}
                    </button>

                    {scanResult && (
                      <div className={`p-3 rounded-2xl text-xs font-mono ${
                        scanResult.error ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {scanResult.error ? `Halted: ${scanResult.error}` : `✓ Audited! Score: ${scanResult.healthScore}/100 • Flaws: ${scanResult.issuesDetected}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ 2. REVIEW QUEUE STUDIO (Split Inspector) ═══════════════════ */}
          {activeTab === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {pendingReports.length === 0 ? (
                <div className="p-16 text-center rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">{t.reviewClean}</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      All audit reports have been verified and processed. When fresh scans detect actionable issues, they queue here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: List of Pending Reports */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t.pendingApprovals} ({pendingReports.length})
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {pendingReports.map(report => {
                        const isSelected = activeReport?.id === report.id;
                        return (
                          <div
                            key={report.id}
                            onClick={() => setSelectedReportId(report.id)}
                            className={`p-4 rounded-3xl border transition cursor-pointer shadow-sm ${
                              isSelected
                                ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-200'
                                : 'bg-white border-slate-100 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full border ${
                                report.severity === 'critical' ? PASTEL.rose.bg + ' ' + PASTEL.rose.text + ' ' + PASTEL.rose.border :
                                report.severity === 'high' ? PASTEL.peach.bg + ' ' + PASTEL.peach.text + ' ' + PASTEL.peach.border :
                                report.severity === 'medium' ? PASTEL.honey.bg + ' ' + PASTEL.honey.text + ' ' + PASTEL.honey.border :
                                PASTEL.sky.bg + ' ' + PASTEL.sky.text + ' ' + PASTEL.sky.border
                              }`}>
                                {report.severity}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                                {report.type}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                              {report.report_title}
                            </h4>
                            <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                              {report.url}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Detailed Inspector */}
                  {activeReport && (
                    <div className="lg:col-span-7 p-7 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] space-y-6">
                      {/* Top Header & Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {activeReport.type}
                            </span>
                            <h3 className="text-base font-bold text-slate-900">{activeReport.report_title}</h3>
                          </div>
                          <p className="text-xs font-mono text-slate-400 mt-1">{activeReport.url}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReject(activeReport.issue_id)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>{t.reject}</span>
                          </button>
                          <button
                            onClick={() => handleApprove(activeReport.issue_id)}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-sm transition"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{t.approve}</span>
                          </button>
                        </div>
                      </div>

                      {/* Language Switch Tabs (English / Native Preview) */}
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <button
                          onClick={() => setNativeReportPreview(false)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                            !nativeReportPreview ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-400 hover:text-slate-800'
                          }`}
                        >
                          English Dispatch Draft
                        </button>
                        {activeReport.report_body_tamil && (
                          <button
                            onClick={() => setNativeReportPreview(true)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                              nativeReportPreview ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-400 hover:text-slate-800'
                            }`}
                          >
                            மொழிபெயர்ப்பு (Translation Preview)
                          </button>
                        )}
                      </div>

                      {/* Body Content */}
                      {!nativeReportPreview ? (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Outgoing SMTP Dispatch Payload (Editable)
                          </label>
                          <textarea
                            rows={8}
                            value={editingBodies[activeReport.issue_id] ?? activeReport.report_body}
                            onChange={(e) => setEditingBodies({ ...editingBodies, [activeReport.issue_id]: e.target.value })}
                            className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
                          />
                          <p className="text-[11px] text-slate-400">
                            Updates are saved automatically and packaged directly into the n8n email node upon approval.
                          </p>
                        </div>
                      ) : (
                        <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans shadow-sm">
                          {activeReport.report_body_tamil}
                        </div>
                      )}

                      {/* Technical Evidence Accordion */}
                      {activeReport.evidence && (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 font-mono text-xs">
                          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">{t.evidence}</span>
                          {activeReport.evidence.selector && (
                            <p className="text-slate-600 truncate"><span className="text-slate-400">DOM Selector:</span> <code>{activeReport.evidence.selector}</code></p>
                          )}
                          {activeReport.evidence.ruleId && (
                            <p className="text-slate-600"><span className="text-slate-400">Rule ID:</span> <code>{activeReport.evidence.ruleId}</code></p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ════ 3. SITES VIEW ══════════════════════════════════════════════ */}
          {activeTab === 'sites' && (
            <motion.div
              key="sites"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Monitored Web Assets Directory</h3>
                    <p className="text-xs text-slate-400">Registered target hostnames under automated Sentinel monitoring</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 font-mono">
                    <thead className="bg-slate-50/80 border-b border-slate-100 uppercase text-[10px] text-slate-400 font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-4">{t.domain}</th>
                        <th className="px-6 py-4">Site Owner / Alert Recipient</th>
                        <th className="px-6 py-4">Health Index</th>
                        <th className="px-6 py-4">Active Flaws</th>
                        <th className="px-6 py-4 text-right">Instant Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sites.map(site => (
                        <tr key={site.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                            <Globe2 className="w-4 h-4 text-indigo-500" />
                            <span>{site.domain}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-sans">
                            {site.owner_email || 'test-recipient@sitesentinel.local'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              site.health_score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {site.health_score}/100
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">{site.open_issues_count || 0}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setScanUrl(`http://${site.domain}/`);
                                setActiveTab('scan');
                              }}
                              className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition font-sans"
                            >
                              {t.auditNow}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {sites.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-sans text-xs">
                            No endpoints enrolled. Run your first audit from the Live Radar Audit view.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ 4. ISSUES EXPLORER VIEW ════════════════════════════════════ */}
          {activeTab === 'issues' && (
            <motion.div
              key="issues"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Filter Controls Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Search */}
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full text-xs bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>

                {/* Severity Pills */}
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                  {[
                    { id: 'all', label: t.filterAll },
                    { id: 'critical', label: t.filterCritical },
                    { id: 'high', label: t.filterHigh },
                    { id: 'medium', label: t.filterMedium },
                    { id: 'low', label: t.filterLow },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSeverityFilter(f.id)}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition ${
                        severityFilter === f.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700 font-mono">
                  <thead className="bg-slate-50/80 border-b border-slate-100 uppercase text-[10px] text-slate-400 font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">{t.severity}</th>
                      <th className="px-6 py-4">Flaw Category</th>
                      <th className="px-6 py-4">Title & Evidence URL</th>
                      <th className="px-6 py-4">Occurrences</th>
                      <th className="px-6 py-4">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIssues.map(issue => (
                      <tr key={issue.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            issue.severity === 'critical' ? PASTEL.rose.bg + ' ' + PASTEL.rose.text + ' ' + PASTEL.rose.border :
                            issue.severity === 'high' ? PASTEL.peach.bg + ' ' + PASTEL.peach.text + ' ' + PASTEL.peach.border :
                            issue.severity === 'medium' ? PASTEL.honey.bg + ' ' + PASTEL.honey.text + ' ' + PASTEL.honey.border :
                            PASTEL.sky.bg + ' ' + PASTEL.sky.text + ' ' + PASTEL.sky.border
                          }`}>
                            {issue.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-indigo-700">{issue.type}</td>
                        <td className="px-6 py-4 font-sans">
                          <div className="font-bold text-slate-900">{issue.title}</div>
                          <div className="text-[11px] font-mono text-slate-400 truncate max-w-md mt-0.5">{issue.url}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{issue.occurrences}x</td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {issue.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredIssues.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-sans text-xs">
                          {t.noIssuesFound}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ════ 5. RUN SCAN VIEW ═══════════════════════════════════════════ */}
          {activeTab === 'scan' && (
            <motion.div
              key="scan"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Radio className="w-5 h-5 text-indigo-600" />
                    <span>{t.newScan}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Initiates an automated Chromium headless crawl with DOM inspection, WCAG 2.1 AA accessibility checks, console error interceptors, and Gemini AI root cause analysis.
                  </p>
                </div>

                {/* Target URL */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-700 uppercase tracking-wider font-mono">Target URL</label>
                    <button
                      type="button"
                      onClick={() => setScanUrl('http://localhost:4000/')}
                      className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl transition"
                    >
                      localhost:4000 (Testbed)
                    </button>
                  </div>

                  <input
                    type="url"
                    value={scanUrl}
                    onChange={(e) => setScanUrl(e.target.value)}
                    placeholder="http://localhost:4000/"
                    className="w-full text-sm font-mono bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-sm"
                  />

                  <button
                    onClick={() => handleTriggerScan()}
                    disabled={scanning}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-500 hover:from-indigo-700 hover:to-teal-600 text-white font-bold text-sm shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {scanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t.scanning}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{t.startScan}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Progress Stages Stream */}
                {scanning && (
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 font-mono text-xs text-white">
                    <div className="flex items-center justify-between text-sky-400 font-bold">
                      <span className="flex items-center gap-2">
                        <Terminal className="w-4 h-4" /> Sentinel Live Telemetry
                      </span>
                      <span className="text-[10px] animate-pulse">RUNNING...</span>
                    </div>
                    <div className="space-y-1.5 text-slate-300 text-[11px]">
                      <p className={scanStage >= 1 ? 'text-emerald-400 flex items-center gap-1.5' : 'text-slate-500'}>
                        {scanStage >= 1 ? '✓' : '○'} [1/4] Spawning Chromium headless sandboxed viewport...
                      </p>
                      <p className={scanStage >= 2 ? 'text-emerald-400 flex items-center gap-1.5' : 'text-slate-500'}>
                        {scanStage >= 2 ? '✓' : '○'} [2/4] Traversing DOM tree & auditing WCAG 2.1 AA contrast...
                      </p>
                      <p className={scanStage >= 3 ? 'text-emerald-400 flex items-center gap-1.5' : 'text-slate-500'}>
                        {scanStage >= 3 ? '✓' : '○'} [3/4] Inspecting console exceptions & HTTP response headers...
                      </p>
                      <p className={scanStage >= 4 ? 'text-sky-400 flex items-center gap-1.5 font-bold' : 'text-slate-500'}>
                        {scanStage >= 4 ? '✓' : '○'} [4/4] Gemini 1.5 Flash synthesizing root-cause & fix report...
                      </p>
                    </div>
                  </div>
                )}

                {scanResult && (
                  <div className={`p-4 rounded-2xl text-xs font-mono font-medium ${
                    scanResult.error ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {scanResult.error ? `Halted: ${scanResult.error}` : `✓ Audit completed! Health Score: ${scanResult.healthScore}/100 • Flaws Detected: ${scanResult.issuesDetected}`}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ════ 6. AUTOMATION VIEW ═════════════════════════════════════════ */}
          {activeTab === 'automation' && (
            <motion.div
              key="automation"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* 3 Pastel Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-sky-700 font-bold flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" /> n8n Automation Engine
                  </span>
                  <h4 className="text-2xl font-bold text-slate-900 font-mono">Connected</h4>
                  <p className="text-xs text-slate-400 font-mono">http://localhost:5678</p>
                </div>

                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> 10-Hour Scheduled Window
                  </span>
                  <h4 className="text-2xl font-bold text-slate-900 font-mono">08:00 - 17:00</h4>
                  <p className="text-xs text-slate-400 font-mono">Cron: 0 8-17 * * *</p>
                </div>

                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 font-bold flex items-center gap-1.5">
                    <Radio className="w-4 h-4" /> Rate Limit Cooldown
                  </span>
                  <h4 className="text-2xl font-bold text-slate-900 font-mono">1 req / 2s</h4>
                  <p className="text-xs text-slate-400 font-mono">Per target domain</p>
                </div>
              </div>

              {/* Workflows List */}
              <div className="p-7 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] space-y-4">
                <h4 className="text-sm font-bold text-slate-900">Enrolled n8n Automation Workflows</h4>
                <div className="space-y-3 font-mono text-xs">
                  {[
                    { name: 'SiteSentinel - Send Approved Reports', trigger: 'Every 5 min poll', status: 'ACTIVE', desc: 'Dispatches verified bug reports via Gmail SMTP' },
                    { name: 'SiteSentinel - Daily Scheduled Scan', trigger: 'Cron (0 8-17 * * *)', status: 'CONFIGURED', desc: 'Triggers hourly audits within business operating window' },
                    { name: 'SiteSentinel - Approval Digest', trigger: 'Daily 09:00 AM', status: 'CONFIGURED', desc: 'Summarizes pending triage queue for security auditor review' },
                  ].map((wf, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="font-bold text-slate-900">{wf.name}</p>
                        <p className="text-[11px] text-slate-400 font-sans mt-0.5">{wf.desc} • <span className="font-mono text-indigo-600">{wf.trigger}</span></p>
                      </div>
                      <span className="px-3 py-1 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {wf.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
