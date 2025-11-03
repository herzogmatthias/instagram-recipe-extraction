import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recipe Studio',
  description:
    'Prototype for extracting and chatting about Instagram recipes using Gemini and local JSON datasets.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          {children}
        </div>
      </body>
    </html>
  );
}
