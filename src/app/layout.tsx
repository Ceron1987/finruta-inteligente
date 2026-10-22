import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FinRuta Inteligente',
  description:
    'Sistema de administración de créditos, cobranza, expedientes y rutas para financieras con colocación a negocios de flujo diario.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-txt antialiased">{children}</body>
    </html>
  );
}
