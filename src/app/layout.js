import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'FinRecede — Autonomous Revenue Recovery Agent',
  description: 'AI-driven revenue recovery agent that detects, diagnoses, and recovers revenue from payment failures, checkout abandonment, subscription failures, and overdue invoices.',
  keywords: 'fintech, revenue recovery, AI agent, payment failure, subscription, invoices',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
