import './globals.css';
import type { Metadata } from 'next';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import IdentityCallbackHandler from '@/components/auth/IdentityCallbackHandler';
import { siteConfig } from '@/lib/config/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.domain),
  title: {
    default: 'Moto Prionas | Μεταχειρισμένες Μοτοσυκλέτες',
    template: '%s | Moto Prionas',
  },
  description:
    'Μεταχειρισμένες μοτοσυκλέτες, πωλήσεις, εισαγωγές, αξεσουάρ και ανταλλακτικά στη Νέα Έφεσο Πιερίας.',
  icons: {
    icon: [
      {
        url: '/motoprionas-logo.png',
        type: 'image/png',
      },
    ],
    shortcut: '/motoprionas-logo.png',
    apple: '/motoprionas-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el">
      <body>
        <IdentityCallbackHandler>
          <Header />
          {children}
          <Footer />
        </IdentityCallbackHandler>
      </body>
    </html>
  );
}