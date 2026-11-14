import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/shell/Nav";
import { themeCss } from "@/lib/theme";
import { HubProvider } from "@/lib/services/useHub";

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
      <body className="min-h-full bg-bg text-ink antialiased">
        <HubProvider>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Nav />
            <main className="min-w-0 flex-1">
              <div className="mx-auto w-full max-w-[1216px] px-4 py-6 md:px-8">{children}</div>
            </main>
          </div>
        </HubProvider>
      </body>
    </html>
  );
}
