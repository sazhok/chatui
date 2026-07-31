import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { SIDEBAR_STORAGE_KEY } from "@/lib/sidebar";
import "./globals.css";

// Runs before hydration so neither the theme nor the sidebar width flashes -
// every product opens in a fresh tab, so this path is hit on each open.
const APP_INIT_SCRIPT = `
(function () {
  try {
    var mode = localStorage.getItem("${THEME_STORAGE_KEY}") || "system";
    var dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {}
  try {
    var panel = localStorage.getItem("${SIDEBAR_STORAGE_KEY}") === "collapsed" ? "collapsed" : "expanded";
    document.documentElement.setAttribute("data-sidebar", panel);
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "chatui",
  description: "Chat UI for vllm-router",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: APP_INIT_SCRIPT }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
