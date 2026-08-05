import { Inter, Outfit, Caveat, Fira_Code } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat' });
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code' });

export const metadata = {
  title: 'PencilDraw - Next.js OpenPencil x tldraw Hybrid',
  description: 'A powerful hybrid infinite canvas whiteboarding and precision UI wireframing web application built with Next.js.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${caveat.variable} ${firaCode.variable}`}>
      <body>{children}</body>
    </html>
  );
}
