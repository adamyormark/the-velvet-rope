import type { Metadata } from 'next';
import { PipelineProvider } from '@/context/PipelineContext';
import StageNavigation from '@/components/layout/StageNavigation';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Velvet Rope',
  description: 'AI-powered event curation through biometric vetting and agent simulation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-navy text-linen antialiased">
        <PipelineProvider>
          <StageNavigation />
          <main className="max-w-6xl mx-auto px-6 pb-12">
            {children}
          </main>
        </PipelineProvider>
      </body>
    </html>
  );
}
