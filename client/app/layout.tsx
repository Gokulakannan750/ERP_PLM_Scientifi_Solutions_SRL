import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ERP - Scientific Solutions",
  description: "Enterprise Resource Planning System for Scientific Solutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme') || 'light';
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(theme);
                document.documentElement.style.colorScheme = theme;
              } catch(e) {}
            })();
          `
        }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 dark:bg-gray-900 transition-colors duration-300`}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
