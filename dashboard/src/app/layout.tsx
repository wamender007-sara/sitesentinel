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
    <html lang="en">
      <body className="bg-[#f8fafc] text-slate-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
