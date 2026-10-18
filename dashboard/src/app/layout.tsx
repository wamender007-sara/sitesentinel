import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SiteSentinel - Autonomous Web Auditing & AI Triage',
  description: 'Proactive quality, accessibility, and reliability auditor for modern web properties.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
