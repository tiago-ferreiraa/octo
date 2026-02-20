import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Health Exam Extractor',
  description: 'Extract structured data from medical exam photos using AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
