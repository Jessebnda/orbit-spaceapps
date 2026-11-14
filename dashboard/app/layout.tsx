import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/shell/Nav";
import { themeCss } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Orbit · Monitor",
  description: "Monitor de la tripulación",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-ink antialiased md:flex-row">
        <Nav />
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </body>
    </html>
  );
}
