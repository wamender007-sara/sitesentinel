'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Globe, 
  Send, 
  Languages, 
  ExternalLink,
  Search,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  CartesianGrid 
} from 'recharts';
import { fetchApi } from '../lib/api';
import { translations, Language } from '../lib/i18n';

export default function Dashboard() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'overview' | 'review' | 'sites' | 'issues' | 'scan'>('overview');
  
  // App state
  const [stats, setStats] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [scanUrl, setScanUrl] = useState('http://localhost:4000/');
  const [scanning, setScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Editable report state in review queue
  const [editingBodies, setEditingBodies] = useState<Record<string, string>>({});

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
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (issueId: string) => {
    try {
      await fetchApi(`/issues/${issueId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          approved_by: 'Dashboard Reviewer',
          report_body: editingBodies[issueId] || undefined,
        }),
      });
      loadData();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleReject = async (issueId: string) => {
    try {
      await fetchApi(`/issues/${issueId}/reject`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    }
  };

  const handleTriggerScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanning(true);
    setScanFeedback(null);
    try {
      const res = await fetchApi('/scans', {
        method: 'POST',
        body: JSON.stringify({ url: scanUrl, autoAnalyze: true }),
      });
      setScanFeedback(`Scan complete! Health Score: ${res.healthScore}/100. Issues Found: ${res.issuesDetected}`);
      loadData();
    } catch (err: any) {
      setScanFeedback(`Scan failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  // Severity chart data
  const severityData = [
    { name: 'Critical', count: issues.filter(i => i.severity === 'critical').length, fill: '#ef4444' },
    { name: 'High', count: issues.filter(i => i.severity === 'high').length, fill: '#f97316' },
    { name: 'Medium', count: issues.filter(i => i.severity === 'medium').length, fill: '#eab308' },
    { name: 'Low', count: issues.filter(i => i.severity === 'low').length, fill: '#3b82f6' },
  ];

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-2 mb-8 px-2">
            <ShieldCheck className="w-8 h-8 text-sky-400" />
            <div>
              <h1 className="font-bold text-lg text-slate-100">{t.appTitle}</h1>
              <p className="text-xs text-slate-400">v1.0.0 Enterprise</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'overview' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              {t.overview}
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'review' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                {t.reviewQueue}
              </div>
              {pendingReports.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {pendingReports.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('sites')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'sites' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Globe className="w-4 h-4" />
              {t.sites}
            </button>

            <button
              onClick={() => setActiveTab('issues')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'issues' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              {t.issues}
            </button>

            <button
              onClick={() => setActiveTab('scan')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'scan' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Send className="w-4 h-4" />
              {t.newScan}
            </button>
          </nav>
        </div>

        {/* Language switch & Rule 4 reminder */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5" /> Language
            </span>
            <div className="flex gap-1 text-xs bg-slate-800 p-0.5 rounded">
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded ${lang === 'en' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('ta')}
                className={`px-2 py-0.5 rounded ${lang === 'ta' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
              >
                தமிழ்
              </button>
            </div>
          </div>
          <div className="text-[11px] leading-tight text-slate-500 p-2 rounded bg-slate-950/60 border border-slate-800/80">
            {t.rule4Notice}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-200">
              {activeTab === 'overview' && t.overview}
              {activeTab === 'review' && t.reviewQueue}
              {activeTab === 'sites' && t.sites}
              {activeTab === 'issues' && t.issues}
              {activeTab === 'scan' && t.newScan}
            </h2>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-700/60"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </header>

        {/* Tab Views */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ── 1. Overview Tab ──────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-xs text-slate-400 uppercase font-medium">{t.totalSites}</p>
                  <p className="text-3xl font-bold text-slate-100 mt-2">{stats?.totalSites ?? sites.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-xs text-slate-400 uppercase font-medium">{t.openIssues}</p>
                  <p className="text-3xl font-bold text-amber-400 mt-2">{stats?.openIssues ?? issues.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-xs text-slate-400 uppercase font-medium">{t.criticalIssues}</p>
                  <p className="text-3xl font-bold text-rose-400 mt-2">{stats?.criticalIssues ?? 0}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-xs text-slate-400 uppercase font-medium">{t.avgHealth}</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-2">{stats?.averageHealthScore ?? 100}/100</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-200 mb-4">Issues by Severity</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={severityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-200 mb-4">Site Health Overview</h3>
                  <div className="space-y-3">
                    {sites.map(site => (
                      <div key={site.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                        <div>
                          <p className="font-medium text-slate-200 text-sm">{site.name || site.domain}</p>
                          <p className="text-xs text-slate-500">{site.domain}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold ${site.health_score > 80 ? 'text-emerald-400' : site.health_score > 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {site.health_score}/100
                          </span>
                        </div>
                      </div>
                    ))}
                    {sites.length === 0 && (
                      <p className="text-xs text-slate-500">No sites audited yet. Run a scan from the Run Scan tab.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 2. Review Queue Tab (Crucial Human-in-the-Loop Page) ────────── */}
          {activeTab === 'review' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-800/40 text-xs text-sky-300">
                <span className="font-semibold">Rule 4 Hard Guarantee:</span> No emails are ever dispatched automatically. Review Gemini AI root cause analysis and evidence below. Editing the email body and clicking <b>Approve</b> moves the report to status <code>approved</code> for n8n delivery.
              </div>

              {pendingReports.length === 0 ? (
                <div className="p-12 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                  <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                  <p className="font-medium text-base text-slate-200">Review queue is clean</p>
                  <p className="text-xs text-slate-500 mt-1">All triaged reports have been evaluated or no pending issues exist.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pendingReports.map(report => (
                    <div key={report.id} className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              {report.severity}
                            </span>
                            <h3 className="font-bold text-slate-100 text-base">{report.report_title}</h3>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Target: <code className="text-sky-300">{report.url}</code></p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(report.issue_id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/40 text-rose-300 border border-rose-800 hover:bg-rose-900/60"
                          >
                            <XCircle className="w-3.5 h-3.5" /> {t.reject}
                          </button>
                          <button
                            onClick={() => handleApprove(report.issue_id)}
                            className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> {t.approve}
                          </button>
                        </div>
                      </div>

                      {/* Evidence & Email Draft Split View */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                        {/* Evidence Column */}
                        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t.evidence}</p>
                          <div className="text-xs text-slate-400 space-y-1">
                            <p><span className="text-slate-500">Flaw Type:</span> {report.type}</p>
                            {report.evidence?.selector && (
                              <p><span className="text-slate-500">Selector:</span> <code>{report.evidence.selector}</code></p>
                            )}
                          </div>
                          {lang === 'ta' && report.report_body_tamil && (
                            <div className="mt-3 p-3 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300">
                              <p className="font-semibold text-sky-400 mb-1">தமிழ் மொழிபெயர்ப்பு (Tamil Report):</p>
                              <p className="whitespace-pre-line">{report.report_body_tamil}</p>
                            </div>
                          )}
                        </div>

                        {/* Editable Email Draft Column */}
                        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Dispatch Draft (Editable)</p>
                          <textarea
                            rows={6}
                            value={editingBodies[report.issue_id] ?? report.report_body}
                            onChange={(e) => setEditingBodies({ ...editingBodies, [report.issue_id]: e.target.value })}
                            className="w-full text-xs bg-slate-900 border border-slate-700 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 3. Sites Tab ─────────────────────────────────────────────────── */}
          {activeTab === 'sites' && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase text-slate-400 font-medium">
                  <tr>
                    <th className="px-4 py-3">{t.domain}</th>
                    <th className="px-4 py-3">Site Owner Email</th>
                    <th className="px-4 py-3">Health Score</th>
                    <th className="px-4 py-3">Open Issues</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {sites.map(site => (
                    <tr key={site.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-200">{site.domain}</td>
                      <td className="px-4 py-3 text-slate-400">{site.owner_email || 'Not Configured'}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${site.health_score > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {site.health_score}/100
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{site.open_issues_count || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setScanUrl(`http://${site.domain}/`);
                            setActiveTab('scan');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-medium"
                        >
                          Audit Now
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sites.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No sites found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 4. Issues Tab ────────────────────────────────────────────────── */}
          {activeTab === 'issues' && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase text-slate-400 font-medium">
                  <tr>
                    <th className="px-4 py-3">{t.severity}</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Occurrences</th>
                    <th className="px-4 py-3">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {issues.map(issue => (
                    <tr key={issue.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          issue.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          issue.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          issue.severity === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        }`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{issue.type}</td>
                      <td className="px-4 py-3 font-medium text-slate-200">{issue.title}</td>
                      <td className="px-4 py-3 text-slate-400">{issue.occurrences}x</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-slate-400">{issue.status}</span>
                      </td>
                    </tr>
                  ))}
                  {issues.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No issues recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 5. Run Scan Tab ──────────────────────────────────────────────── */}
          {activeTab === 'scan' && (
            <div className="max-w-xl mx-auto p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-slate-100">{t.newScan}</h3>
              <p className="text-xs text-slate-400">
                Enter an allowlisted target URL to initiate a passive, read-only Playwright crawl with full detection checks and Gemini AI triage.
              </p>

              <form onSubmit={handleTriggerScan} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target URL</label>
                  <input
                    type="url"
                    required
                    value={scanUrl}
                    onChange={(e) => setScanUrl(e.target.value)}
                    placeholder={t.scanUrlPlaceholder}
                    className="w-full text-sm bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={scanning}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-50 transition"
                >
                  {scanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {t.scanning}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t.startScan}
                    </>
                  )}
                </button>
              </form>

              {scanFeedback && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200">
                  {scanFeedback}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
