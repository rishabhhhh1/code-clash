import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CodeClash - Competitive Coding Platform',
  description: 'Transform coding practice into competitive multiplayer battles with CodeClash',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <header className="border-b">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <a href="/" className="text-2xl font-bold text-primary">
                CodeClash
              </a>
              <nav className="flex items-center gap-6">
                <a href="/lobby" className="text-sm font-medium hover:text-primary transition-colors">
                  Lobby
                </a>
                <a href="/matchmaking" className="text-sm font-medium hover:text-primary transition-colors">
                  Matchmaking
                </a>
                <a href="/problems" className="text-sm font-medium hover:text-primary transition-colors">
                  Problems
                </a>
                <a href="/rankings" className="text-sm font-medium hover:text-primary transition-colors">
                  Rankings
                </a>
                <a href="/admin" className="text-sm font-medium hover:text-primary transition-colors">
                  Admin
                </a>
              </nav>
              <div className="flex items-center gap-4">
                <a
                  href="/settings"
                  className="px-4 py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  Settings
                </a>
                <a
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  Log In
                </a>
                <a
                  href="/auth/register"
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Sign Up
                </a>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
