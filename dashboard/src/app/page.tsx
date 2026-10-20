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
  X,
  Gauge,
  Sliders,
  Shield,
  Server
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  LabelList
} from 'recharts';
import { fetchApi } from '../lib/api';
import { translations, Language, SUPPORTED_LANGUAGES } from '../lib/i18n';

// ── Strict Operational Severity Palette (Linear / Sentry / Datadog Style) ────
const SEVERITY = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: '#991b1b', dot: 'bg-red-600' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', bar: '#dc2626', dot: 'bg-orange-600' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: '#d97706', dot: 'bg-amber-500' },
  low: { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-200', bar: '#71717a', dot: 'bg-zinc-500' },
};

const RANDOM_TARGETS_POOL = [
  'https://www.resumereviewer.in',
  'https://news.ycombinator.com',
  'https://example.com',
  'https://developer.mozilla.org',
  'https://github.com',
  'https://en.wikipedia.org/wiki/Main_Page',
];

export default function Dashboard() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang] || translations.en;

  // Navigation (Left Sidebar on Desktop, In-Flow Tab Bar on Mobile)
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
  const [scanUrl, setScanUrl] = useState('https://www.resumereviewer.in');
  const [scanning, setScanning] = useState(false);
  const [auditingSiteId, setAuditingSiteId] = useState<string | null>(null);
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
        colors: ['#09090b', '#2563eb', '#16a34a', '#dc2626']
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

  const handleTriggerScan = async (targetUrl?: string, siteId?: string) => {
    const url = targetUrl || scanUrl;
    setScanning(true);
    if (siteId) {
      setAuditingSiteId(siteId);
    }
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
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#09090b', '#16a34a', '#2563eb']
      });

      loadData();
    } catch (err: any) {
      setScanResult({ error: err.message });
    } finally {
      clearTimeout(s1);
      clearTimeout(s2);
      setTimeout(() => {
        setScanning(false);
        setAuditingSiteId(null);
        setScanStage(0);
      }, 1400);
    }
  };

  // Monochromatic Severity Ramp Chart Data
  const severityChartData = [
    { name: 'Critical', count: issues.filter(i => i.severity === 'critical' && !['resolved', 'rejected', 'rejected_by_ai'].includes(i.status)).length, fill: SEVERITY.critical.bar },
    { name: 'High', count: issues.filter(i => i.severity === 'high' && !['resolved', 'rejected', 'rejected_by_ai'].includes(i.status)).length, fill: SEVERITY.high.bar },
    { name: 'Medium', count: issues.filter(i => i.severity === 'medium' && !['resolved', 'rejected', 'rejected_by_ai'].includes(i.status)).length, fill: SEVERITY.medium.bar },
    { name: 'Low', count: issues.filter(i => i.severity === 'low' && !['resolved', 'rejected', 'rejected_by_ai'].includes(i.status)).length, fill: SEVERITY.low.bar },
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

  const formatUrl = (u: string) => {
    if (!u) return '';
    return u
      .replace('sitesentinel.devtestbed', 'sitesentinel.dev/testbed')
      .replace('sitesentinel.devbroken', 'sitesentinel.dev/broken-link-target')
      .replace('sitesentinel.devslow', 'sitesentinel.dev/slow');
  };

  const navItems = [
    { id: 'overview', icon: Activity, label: t.overview },
    { id: 'review', icon: FileText, label: t.reviewQueue, badge: pendingReports.length },
    { id: 'sites', icon: Globe2, label: t.sites, count: sites.length },
    { id: 'issues', icon: AlertTriangle, label: t.issues, count: issues.length },
    { id: 'scan', icon: Zap, label: t.newScan },
    { id: 'automation', icon: Workflow, label: t.automation },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 antialiased font-sans flex flex-col md:flex-row">
      
      {/* ── 1. Left Fixed Sidebar (Desktop >= 768px, 240px Width) ──────── */}
      <aside className="hidden md:flex flex-col w-60 fixed left-0 top-0 bottom-0 bg-white border-r border-zinc-200 z-30 select-none">
        {/* Workspace Brand Header */}
        <div className="h-13 px-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-zinc-900 flex items-center justify-center text-white">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-xs tracking-tight text-zinc-900">SiteSentinel</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Engine Live" />
              </div>
              <span className="text-[10px] font-mono text-zinc-400">cluster-us-east · prod</span>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 text-xs">
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Operations
            </div>
            <nav className="space-y-0.5">
              {navItems.slice(0, 5).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
                      isActive 
                        ? 'bg-zinc-100 text-zinc-900 font-semibold border-l-2 border-zinc-900 rounded-l-none' 
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-1.5 py-0.2 text-[10px] font-mono font-bold rounded ${
                        isActive ? 'bg-zinc-900 text-white' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {item.count !== undefined && !item.badge && (
                      <span className="text-[10px] font-mono text-zinc-400">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="px-2 pb-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Engine & Integrations
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => setActiveTab('automation')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
                  activeTab === 'automation'
                    ? 'bg-zinc-100 text-zinc-900 font-semibold border-l-2 border-zinc-900 rounded-l-none'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Workflow className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{t.automation}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 font-semibold">Ready</span>
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 font-medium transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <Languages className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{t.language}</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">{currentLangInfo.nativeName}</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer Identity */}
        <div className="p-3 border-t border-zinc-200 bg-zinc-50/60 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="truncate">
            <p className="font-semibold text-zinc-700 truncate">lead-sre@sitesentinel.dev</p>
            <p className="text-[10px] text-zinc-400">Rule 4 Sentinel v1.4</p>
          </div>
          <button
            onClick={loadData}
            title="Sync Data"
            className="p-1.5 rounded hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* ── 2. Mobile In-Flow Bottom Tab Bar (< 768px) ─────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-zinc-200 z-40 flex items-center justify-around px-1 select-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] transition-colors ${
                isActive ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold rounded-full bg-red-600 text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── 3. Main Workspace Area (Offset by 240px on Desktop) ─────────── */}
      <div className="flex-1 md:pl-60 flex flex-col min-h-screen">
        
        {/* Slim Operational Top Bar */}
        <header className="h-12 border-b border-zinc-200 bg-white px-4 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-900">SiteSentinel</span>
            <span>/</span>
            <span className="capitalize">{activeTab}</span>
          </div>

          {/* Right Header Status Line: Rule 4 Human Guard + Actions */}
          <div className="flex items-center gap-3">
            {/* Rule 4 Compact Inline Status Chip */}
            <div 
              onClick={() => setActiveTab('review')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition select-none"
              title="Rule 4 Human-in-the-Loop Gate"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="font-medium text-zinc-600">Rule 4 Active:</span>
              <span className="font-semibold text-zinc-900">
                {pendingReports.length > 0 ? `${pendingReports.length} pending review` : 'All clear'}
              </span>
              {pendingReports.length > 0 && (
                <ArrowUpRight className="w-3 h-3 text-zinc-400" />
              )}
            </div>

            {/* Language Switch Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="px-2 py-1 rounded text-xs border border-zinc-200 hover:bg-zinc-50 text-zinc-700 flex items-center gap-1.5 font-mono"
            >
              <span>{currentLangInfo.flag}</span>
              <span className="hidden sm:inline">{currentLangInfo.code.toUpperCase()}</span>
            </button>

            {/* Quick Refresh */}
            <button
              onClick={loadData}
              title="Refresh Telemetry"
              className="p-1 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* ── Main Canvas Viewport ─────────────────────────────────────── */}
        <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto pb-20 md:pb-8">
          <AnimatePresence mode="wait">
            
            {/* ════ VIEW 1: OVERVIEW ══════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Asymmetric KPI Metric Grid (Hero Average Health + 3 Compact Units) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Hero Metric Unit: Average Health Score (5 Columns) */}
                  <div className="lg:col-span-5 p-5 bg-white border border-zinc-200 rounded-md flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        {t.avgHealth}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                        avgHealth >= 80 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {avgHealth >= 80 ? 'Grade A · Within SLA' : 'Grade C · Needs Attention'}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-extrabold tracking-tight font-mono text-zinc-900">
                        {avgHealth}
                      </span>
                      <span className="text-sm font-mono text-zinc-400">/ 100</span>
                      <span className="text-xs font-mono text-emerald-600 font-semibold ml-auto">
                        +2.4% vs 7d avg
                      </span>
                    </div>

                    {/* Sub-Score Breakdown Bars */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-100 text-[11px] font-mono text-zinc-500">
                      <div className="flex justify-between items-center">
                        <span>WCAG 2.1 Contrast & Semantics</span>
                        <span className="font-semibold text-zinc-700">96%</span>
                      </div>
                      <div className="w-full bg-zinc-100 h-1 rounded-full overflow-hidden">
                        <div className="bg-zinc-900 h-full rounded-full" style={{ width: '96%' }} />
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <span>Latency & TTFB Response</span>
                        <span className="font-semibold text-zinc-700">89%</span>
                      </div>
                      <div className="w-full bg-zinc-100 h-1 rounded-full overflow-hidden">
                        <div className="bg-zinc-900 h-full rounded-full" style={{ width: '89%' }} />
                      </div>
                    </div>

                    <p className="text-xs text-zinc-500 pt-1">
                      {pendingReports.length > 0 
                        ? `${pendingReports.length} verified flaw reports waiting for human QA approval.` 
                        : 'All monitored targets nominal with zero blocking defects.'}
                    </p>
                  </div>

                  {/* 3 Compact Secondary Metrics (7 Columns) */}
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Compact Card 1: Monitored Targets */}
                    <div className="p-4 bg-white border border-zinc-200 rounded-md flex flex-col justify-between space-y-2">
                      <span className="text-xs font-medium text-zinc-500">Monitored Targets</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold font-mono text-zinc-900">
                          {stats?.totalSites ?? sites.length}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">endpoints</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-snug">
                        Enrolled in automated hourly Playwright inspection cycle.
                      </p>
                    </div>

                    {/* Compact Card 2: Active Flaws */}
                    <div className="p-4 bg-white border border-zinc-200 rounded-md flex flex-col justify-between space-y-2">
                      <span className="text-xs font-medium text-zinc-500">Indexed Flaws</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold font-mono text-zinc-900">
                          {stats?.openIssues ?? issues.length}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">issues</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-snug">
                        Deduplicated by SHA-256 DOM fingerprinting.
                      </p>
                    </div>

                    {/* Compact Card 3: Critical Issues */}
                    <div className="p-4 bg-white border border-zinc-200 rounded-md flex flex-col justify-between space-y-2">
                      <span className="text-xs font-medium text-zinc-500">Critical Issues</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold font-mono text-red-700">
                          {stats?.criticalIssues ?? issues.filter(i => i.severity === 'critical').length}
                        </span>
                        <span className="text-xs font-mono text-red-600 font-semibold">blocking</span>
                      </div>
                      <p className="text-[11px] text-red-700 font-medium leading-snug">
                        Immediate triage required before production release.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Middle Grid: Monochromatic Severity Ramp Chart + Instant Audit Launcher */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  
                  {/* Monochromatic Severity Bar Chart (7 Columns) */}
                  <div className="lg:col-span-7 p-5 bg-white border border-zinc-200 rounded-md space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                          Flaw Severity Breakdown
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Quantified from automated accessibility and runtime telemetry passes
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                        Telemetry Live
                      </span>
                    </div>

                    <div className="h-60 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={severityChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="2 2" stroke="#f4f4f5" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            stroke="#71717a" 
                            tick={{ fontSize: 11, fill: '#71717a' }} 
                            axisLine={{ stroke: '#e4e4e7' }}
                            tickLine={false}
                          />
                          <YAxis 
                            stroke="#71717a" 
                            allowDecimals={false} 
                            tick={{ fontSize: 11, fill: '#71717a' }} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip 
                            cursor={{ fill: '#f4f4f5' }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white px-3 py-2 rounded border border-zinc-200 shadow-sm text-xs font-mono">
                                    <p className="font-bold text-zinc-900">{label}</p>
                                    <p className="text-zinc-600 mt-0.5">
                                      Count: <span className="font-bold text-zinc-900">{payload[0].value}</span>
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={40}>
                            <LabelList dataKey="count" position="top" fill="#27272a" fontSize={11} fontWeight={600} />
                            {severityChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Instant Audit Launcher (5 Columns) */}
                  <div className="lg:col-span-5 p-5 bg-white border border-zinc-200 rounded-md space-y-4">
                    <div className="border-b border-zinc-100 pb-3">
                      <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-zinc-900" />
                        <span>Instant Target Audit</span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Launches headless Chromium with DOM, WCAG 2.1 AA, and latency probes.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-mono text-zinc-500 block mb-1">Target Endpoint URL</label>
                        <input
                          type="url"
                          value={scanUrl}
                          onChange={(e) => setScanUrl(e.target.value)}
                          placeholder="https://www.resumereviewer.in"
                          className="w-full text-xs font-mono bg-white border border-zinc-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                        />
                      </div>

                      {/* Clean Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[11px] text-zinc-400">Presets:</span>
                        {[
                          { label: 'demo-testbed', url: 'https://demo-testbed.sitesentinel.dev' },
                          { label: 'resumereviewer.in', url: 'https://www.resumereviewer.in' },
                          { label: 'hackernews', url: 'https://news.ycombinator.com' },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setScanUrl(preset.url)}
                            className={`px-2 py-0.5 rounded text-[11px] font-mono transition border ${
                              scanUrl.includes(preset.label.replace('.in', ''))
                                ? 'bg-zinc-900 text-white border-zinc-900 font-semibold'
                                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const randomUrl = RANDOM_TARGETS_POOL[Math.floor(Math.random() * RANDOM_TARGETS_POOL.length)];
                            setScanUrl(randomUrl);
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-mono text-zinc-600 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200"
                        >
                          🎲 Random
                        </button>
                      </div>

                      {/* Primary Trigger Button */}
                      <button
                        onClick={() => handleTriggerScan()}
                        disabled={scanning}
                        className="w-full py-2.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {scanning ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Auditing Target...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Launch Target Audit</span>
                          </>
                        )}
                      </button>

                      {/* Scan Telemetry Terminal */}
                      {scanning && (
                        <div className="p-3 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-1">
                          <p className="text-emerald-400 font-bold">[1/4] Spawning Chromium headless viewport...</p>
                          {scanStage >= 2 && <p className="text-emerald-400">[2/4] Traversing DOM & WCAG AA contrast rules...</p>}
                          {scanStage >= 3 && <p className="text-emerald-400">[3/4] Inspecting console exceptions & HTTP status...</p>}
                          {scanStage >= 4 && <p className="text-blue-400 font-bold">[4/4] Gemini AI analyzing root-cause remediation...</p>}
                        </div>
                      )}

                      {scanResult && (
                        <div className={`p-3 rounded text-xs font-mono ${
                          scanResult.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {scanResult.error ? `Failed: ${scanResult.error}` : `✓ Audit Complete: Health Score ${scanResult.healthScore}/100 • ${scanResult.issuesDetected} flaws detected.`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Overview Section: Recent Detected Flaws Mini-Table */}
                <div className="bg-white border border-zinc-200 rounded-md p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                      Recent Flaw Telemetry
                    </h3>
                    <button 
                      onClick={() => setActiveTab('issues')}
                      className="text-xs text-zinc-500 hover:text-zinc-900 font-medium flex items-center gap-1"
                    >
                      <span>View all {issues.length} flaws</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-zinc-50 text-[10px] text-zinc-400 uppercase tracking-wider border-b border-zinc-200">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Severity</th>
                          <th className="px-3 py-2 font-semibold">Flaw Type</th>
                          <th className="px-3 py-2 font-semibold">Title & Evidence URL</th>
                          <th className="px-3 py-2 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {issues.slice(0, 5).map((issue) => (
                          <tr key={issue.id} className="hover:bg-zinc-50/60 transition">
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                issue.severity === 'critical' ? SEVERITY.critical.bg + ' ' + SEVERITY.critical.text + ' ' + SEVERITY.critical.border :
                                issue.severity === 'high' ? SEVERITY.high.bg + ' ' + SEVERITY.high.text + ' ' + SEVERITY.high.border :
                                issue.severity === 'medium' ? SEVERITY.medium.bg + ' ' + SEVERITY.medium.text + ' ' + SEVERITY.medium.border :
                                SEVERITY.low.bg + ' ' + SEVERITY.low.text + ' ' + SEVERITY.low.border
                              }`}>
                                {issue.severity}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-zinc-700">{issue.type}</td>
                            <td className="px-3 py-2.5 font-sans">
                              <p className="font-semibold text-zinc-900 leading-tight">{issue.title}</p>
                              <p className="text-[11px] font-mono text-zinc-400 truncate max-w-md mt-0.5">{formatUrl(issue.url)}</p>
                            </td>
                            <td className="px-3 py-2.5 text-right font-sans">
                              <button
                                onClick={() => setActiveTab('review')}
                                className="text-[11px] font-medium text-zinc-700 hover:text-zinc-900 px-2.5 py-1 rounded border border-zinc-200 hover:bg-zinc-50 transition"
                              >
                                Triage
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════ VIEW 2: REVIEW QUEUE STUDIO (Dense 4:8 Split) ══════════════ */}
            {activeTab === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {pendingReports.length === 0 ? (
                  <div className="p-16 text-center bg-white border border-zinc-200 rounded-md space-y-3">
                    <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Review Queue Clear</h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        All verified issues have been audited and dispatched. When fresh scans detect actionable issues, they queue here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    
                    {/* Left Master List (4 Columns) */}
                    <div className="lg:col-span-4 space-y-2">
                      <div className="px-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex justify-between items-center">
                        <span>Pending Approvals</span>
                        <span className="font-mono text-[11px] text-zinc-400">{pendingReports.length} reports</span>
                      </div>

                      <div className="space-y-1.5">
                        {pendingReports.map(report => {
                          const isSelected = activeReport?.id === report.id;
                          return (
                            <div
                              key={report.id}
                              onClick={() => setSelectedReportId(report.id)}
                              className={`p-3 rounded border transition cursor-pointer ${
                                isSelected
                                  ? 'bg-white border-zinc-900 border-l-4 border-l-zinc-900 shadow-xs'
                                  : 'bg-white border-zinc-200 hover:border-zinc-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase rounded border ${
                                  report.severity === 'critical' ? SEVERITY.critical.bg + ' ' + SEVERITY.critical.text + ' ' + SEVERITY.critical.border :
                                  report.severity === 'high' ? SEVERITY.high.bg + ' ' + SEVERITY.high.text + ' ' + SEVERITY.high.border :
                                  report.severity === 'medium' ? SEVERITY.medium.bg + ' ' + SEVERITY.medium.text + ' ' + SEVERITY.medium.border :
                                  SEVERITY.low.bg + ' ' + SEVERITY.low.text + ' ' + SEVERITY.low.border
                                }`}>
                                  {report.severity}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">
                                  {report.type}
                                </span>
                              </div>
                              <h4 className="text-xs font-semibold text-zinc-900 mt-1.5 line-clamp-2 leading-snug">
                                {report.report_title}
                              </h4>
                              <p className="text-[10px] font-mono text-zinc-400 mt-1 truncate">
                                {formatUrl(report.url)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Detailed Inspector (8 Columns) */}
                    {activeReport && (
                      <div className="lg:col-span-8 p-6 bg-white border border-zinc-200 rounded-md space-y-5">
                        {/* 1. Header Metadata Section */}
                        <div className="space-y-3 pb-4 border-b border-zinc-100">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                                activeReport.severity === 'critical' ? SEVERITY.critical.bg + ' ' + SEVERITY.critical.text + ' ' + SEVERITY.critical.border :
                                activeReport.severity === 'high' ? SEVERITY.high.bg + ' ' + SEVERITY.high.text + ' ' + SEVERITY.high.border :
                                activeReport.severity === 'medium' ? SEVERITY.medium.bg + ' ' + SEVERITY.medium.text + ' ' + SEVERITY.medium.border :
                                SEVERITY.low.bg + ' ' + SEVERITY.low.text + ' ' + SEVERITY.low.border
                              }`}>
                                {activeReport.severity}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-700 border border-zinc-200">
                                {activeReport.type}
                              </span>
                              <span className="text-[11px] font-mono text-zinc-400">
                                Rule 4 Sentinel QA Gate
                              </span>
                            </div>

                            <span className="text-[10px] font-mono text-zinc-400">
                              ID: {activeReport.issue_id ? activeReport.issue_id.slice(0, 8) : '001'}
                            </span>
                          </div>

                          <h2 className="text-lg font-bold text-zinc-900 leading-snug">
                            {activeReport.report_title}
                          </h2>

                          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded border border-zinc-200 w-fit">
                            <Globe2 className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="select-all">{formatUrl(activeReport.url)}</span>
                          </div>
                        </div>

                        {/* 2. Destination & Action Control Panel */}
                        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-mono text-zinc-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-zinc-500 font-sans">Recipient:</span>
                            <span className="font-bold text-zinc-900">saravanprasanna@gmail.com</span>
                            <span className="text-[10px] font-bold text-zinc-500 px-1.5 py-0.2 bg-zinc-200 rounded">
                              SMTP
                            </span>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                              onClick={() => handleReject(activeReport.issue_id)}
                              className="px-3 py-1.5 rounded text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 transition"
                            >
                              Mark as False Positive
                            </button>
                            <button
                              onClick={() => handleApprove(activeReport.issue_id)}
                              className="px-4 py-1.5 rounded text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 transition flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve & Dispatch Mail</span>
                            </button>
                          </div>
                        </div>

                        {/* 3. Dispatch Payload Editor */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setNativeReportPreview(false)}
                                className={`text-xs px-2.5 py-1 rounded font-medium transition ${
                                  !nativeReportPreview ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                                }`}
                              >
                                English Dispatch Draft
                              </button>
                              {activeReport.report_body_tamil && (
                                <button
                                  onClick={() => setNativeReportPreview(true)}
                                  className={`text-xs px-2.5 py-1 rounded font-medium transition ${
                                    nativeReportPreview ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                                  }`}
                                >
                                  மொழிபெயர்ப்பு (Translation)
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">
                              Editable Markdown Payload
                            </span>
                          </div>

                          {!nativeReportPreview ? (
                            <div className="space-y-1.5">
                              <textarea
                                rows={8}
                                value={editingBodies[activeReport.issue_id] ?? activeReport.report_body}
                                onChange={(e) => setEditingBodies({ ...editingBodies, [activeReport.issue_id]: e.target.value })}
                                className="w-full text-xs font-mono bg-zinc-50 border border-zinc-200 rounded p-3 text-zinc-900 focus:outline-none focus:border-zinc-900 leading-relaxed"
                              />
                              <p className="text-[11px] text-zinc-400">
                                Rule 4 Gate: Changes save automatically and dispatch directly to saravanprasanna@gmail.com upon approval.
                              </p>
                            </div>
                          ) : (
                            <div className="p-4 rounded bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 whitespace-pre-line leading-relaxed font-sans">
                              {activeReport.report_body_tamil}
                            </div>
                          )}
                        </div>

                        {/* 4. Technical Telemetry Evidence */}
                        {activeReport.evidence && (
                          <div className="p-3 rounded bg-zinc-50 border border-zinc-200 space-y-1 font-mono text-xs">
                            <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Telemetry Evidence</span>
                            {activeReport.evidence.selector && (
                              <p className="text-zinc-700 truncate"><span className="text-zinc-400">Selector:</span> <code>{activeReport.evidence.selector}</code></p>
                            )}
                            {activeReport.evidence.ruleId && (
                              <p className="text-zinc-700"><span className="text-zinc-400">Rule ID:</span> <code>{activeReport.evidence.ruleId}</code></p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ════ VIEW 3: MONITORED TARGETS ═════════════════════════════════ */}
            {activeTab === 'sites' && (
              <motion.div
                key="sites"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="bg-white border border-zinc-200 rounded-md p-5 space-y-4"
              >
                <div className="border-b border-zinc-100 pb-3">
                  <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                    Monitored Target Endpoints
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Registered domain hosts under automated continuous Playwright security audits
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-50 text-[10px] text-zinc-400 uppercase tracking-wider border-b border-zinc-200">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Domain Target</th>
                        <th className="px-4 py-2.5 font-semibold">Alert Recipient</th>
                        <th className="px-4 py-2.5 font-semibold">Health Score</th>
                        <th className="px-4 py-2.5 font-semibold">Active Flaws</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {sites.map(site => (
                        <tr key={site.id} className="hover:bg-zinc-50/60 transition">
                          <td className="px-4 py-3 font-semibold text-zinc-900 flex items-center gap-2">
                            <Globe2 className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{site.domain}</span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 font-sans">
                            {site.owner_email || 'saravanprasanna@gmail.com'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              site.health_score >= 80 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {site.health_score}/100
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-zinc-800">{site.open_issues_count || 0}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                const targetProtocol = site.domain.startsWith('http') ? '' : 'https://';
                                const fullUrl = site.domain.startsWith('http') ? site.domain : `${targetProtocol}${site.domain}/`;
                                setScanUrl(fullUrl);
                                handleTriggerScan(fullUrl, site.id);
                              }}
                              disabled={scanning}
                              className="px-2.5 py-1 rounded text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition font-sans disabled:opacity-50"
                            >
                              {auditingSiteId === site.id ? 'Auditing...' : t.auditNow}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {sites.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-zinc-400 font-sans text-xs">
                            No endpoints enrolled. Run your first audit from the Live Radar Audit view.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ════ VIEW 4: ISSUES EXPLORER ════════════════════════════════════ */}
            {activeTab === 'issues' && (
              <motion.div
                key="issues"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter by issue title, type, or URL..."
                      className="w-full text-xs bg-white border border-zinc-200 rounded pl-8 pr-3 py-1.5 text-zinc-900 focus:outline-none focus:border-zinc-900"
                    />
                  </div>

                  {/* Severity Filter Pills */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded border border-zinc-200">
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
                        className={`px-2.5 py-0.5 text-xs rounded font-medium transition ${
                          severityFilter === f.id
                            ? 'bg-zinc-900 text-white'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flat Issues Table */}
                <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-50 text-[10px] text-zinc-400 uppercase tracking-wider border-b border-zinc-200">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">{t.severity}</th>
                        <th className="px-4 py-2.5 font-semibold">Flaw Category</th>
                        <th className="px-4 py-2.5 font-semibold">Title & Evidence URL</th>
                        <th className="px-4 py-2.5 font-semibold">Occurrences</th>
                        <th className="px-4 py-2.5 font-semibold">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredIssues.map(issue => (
                        <tr key={issue.id} className="hover:bg-zinc-50/60 transition">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              issue.severity === 'critical' ? SEVERITY.critical.bg + ' ' + SEVERITY.critical.text + ' ' + SEVERITY.critical.border :
                              issue.severity === 'high' ? SEVERITY.high.bg + ' ' + SEVERITY.high.text + ' ' + SEVERITY.high.border :
                              issue.severity === 'medium' ? SEVERITY.medium.bg + ' ' + SEVERITY.medium.text + ' ' + SEVERITY.medium.border :
                              SEVERITY.low.bg + ' ' + SEVERITY.low.text + ' ' + SEVERITY.low.border
                            }`}>
                              {issue.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-700">{issue.type}</td>
                          <td className="px-4 py-3 font-sans">
                            <p className="font-semibold text-zinc-900 leading-tight">{issue.title}</p>
                            <p className="text-[11px] font-mono text-zinc-400 truncate max-w-lg mt-0.5">{formatUrl(issue.url)}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold text-zinc-800">{issue.occurrences}x</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                              {issue.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredIssues.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-zinc-400 font-sans text-xs">
                            {t.noIssuesFound}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ════ VIEW 5: SCAN RUNNER ════════════════════════════════════════ */}
            {activeTab === 'scan' && (
              <motion.div
                key="scan"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="max-w-2xl mx-auto space-y-4"
              >
                <div className="bg-white border border-zinc-200 rounded-md p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-zinc-900" />
                      <span>{t.newScan}</span>
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Execute headless Chromium crawl with WCAG AA compliance, DOM traversal, and AI remediation.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-mono text-zinc-500 block mb-1">Target Endpoint URL</label>
                      <input
                        type="url"
                        value={scanUrl}
                        onChange={(e) => setScanUrl(e.target.value)}
                        placeholder="https://www.resumereviewer.in"
                        className="w-full text-xs font-mono bg-white border border-zinc-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-zinc-400">Presets:</span>
                      {[
                        { label: 'demo-testbed', url: 'https://demo-testbed.sitesentinel.dev' },
                        { label: 'resumereviewer.in', url: 'https://www.resumereviewer.in' },
                        { label: 'hackernews', url: 'https://news.ycombinator.com' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setScanUrl(preset.url)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                            scanUrl.includes(preset.label.replace('.in', ''))
                              ? 'bg-zinc-900 text-white border-zinc-900'
                              : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handleTriggerScan()}
                      disabled={scanning}
                      className="w-full py-2.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {scanning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Auditing Target...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>{t.startScan}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {scanning && (
                    <div className="p-3 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-1">
                      <p className="text-emerald-400 font-bold">[1/4] Spawning Chromium headless sandboxed viewport...</p>
                      {scanStage >= 2 && <p className="text-emerald-400">[2/4] Traversing DOM tree & auditing WCAG 2.1 AA contrast...</p>}
                      {scanStage >= 3 && <p className="text-emerald-400">[3/4] Inspecting console exceptions & HTTP response headers...</p>}
                      {scanStage >= 4 && <p className="text-blue-400 font-bold">[4/4] Gemini 1.5 Flash synthesizing root-cause & fix report...</p>}
                    </div>
                  )}

                  {scanResult && (
                    <div className={`p-3 rounded text-xs font-mono ${
                      scanResult.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {scanResult.error ? `Failed: ${scanResult.error}` : `✓ Audit completed: Health Score ${scanResult.healthScore}/100 • ${scanResult.issuesDetected} flaws detected.`}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ════ VIEW 6: AUTOMATION & SCHEDULER ═════════════════════════════ */}
            {activeTab === 'automation' && (
              <motion.div
                key="automation"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white border border-zinc-200 rounded-md space-y-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold">n8n Engine</span>
                    <h4 className="text-xl font-bold font-mono text-zinc-900">Connected</h4>
                    <p className="text-xs text-zinc-400 font-mono">https://n8n-engine.sitesentinel.dev</p>
                  </div>

                  <div className="p-4 bg-white border border-zinc-200 rounded-md space-y-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold">Scheduled Window</span>
                    <h4 className="text-xl font-bold font-mono text-zinc-900">08:00 - 17:00</h4>
                    <p className="text-xs text-zinc-400 font-mono">Cron: 0 8-17 * * *</p>
                  </div>

                  <div className="p-4 bg-white border border-zinc-200 rounded-md space-y-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold">Rate Limit Cooldown</span>
                    <h4 className="text-xl font-bold font-mono text-zinc-900">1 req / 2s</h4>
                    <p className="text-xs text-zinc-400 font-mono">Per target domain</p>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-md p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                    Enrolled n8n Automation Workflows
                  </h4>
                  <div className="space-y-2 font-mono text-xs">
                    {[
                      { name: 'SiteSentinel - Send Approved Reports', trigger: 'Every 5 min poll', status: 'ACTIVE', desc: 'Dispatches verified bug reports via Gmail SMTP' },
                      { name: 'SiteSentinel - Daily Scheduled Scan', trigger: 'Cron (0 8-17 * * *)', status: 'CONFIGURED', desc: 'Triggers hourly audits within business operating window' },
                      { name: 'SiteSentinel - Approval Digest', trigger: 'Daily 09:00 AM', status: 'CONFIGURED', desc: 'Summarizes pending triage queue for security auditor review' },
                    ].map((wf, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded bg-zinc-50 border border-zinc-200">
                        <div>
                          <p className="font-semibold text-zinc-900">{wf.name}</p>
                          <p className="text-[11px] text-zinc-500 font-sans mt-0.5">{wf.desc} • <span className="font-mono text-zinc-700">{wf.trigger}</span></p>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
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

      {/* ── Settings Modal (Language & Region Selector) ─────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="w-full max-w-md bg-white rounded-md p-5 shadow-lg border border-zinc-200 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-zinc-900" />
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">{t.language}</h3>
                    <p className="text-[11px] text-zinc-500">{t.languageDesc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Languages Grid */}
              <div className="grid grid-cols-2 gap-2">
                {SUPPORTED_LANGUAGES.map((item) => {
                  const isCurrent = lang === item.code;
                  return (
                    <button
                      key={item.code}
                      onClick={() => setLang(item.code)}
                      className={`flex items-center justify-between p-2.5 rounded border transition-all text-left ${
                        isCurrent 
                          ? 'bg-zinc-100 border-zinc-900 font-semibold' 
                          : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.flag}</span>
                        <div>
                          <p className="text-xs text-zinc-900">{item.nativeName}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{item.label}</p>
                        </div>
                      </div>
                      {isCurrent && (
                        <Check className="w-3.5 h-3.5 text-zinc-900" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400">
                  Regional Multi-Lingual Core
                </span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
