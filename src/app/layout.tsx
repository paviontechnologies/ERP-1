import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Shell } from '@/components/layout/Shell';

export const metadata: Metadata = {
  title: 'Apex AI Voice ERP - Intelligent Enterprise Platform',
  description: 'Enterprise Resource Planning platform connecting Finance, HR, Manufacturing, SCM, Procurement, Sales, Inventory, and CRM with multilingual AI Voice Assistant.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100">
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
