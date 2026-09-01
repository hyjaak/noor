import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { RuntimePolish } from "@/components/RuntimePolish";
import { QuietProvider } from "@/components/QuietProvider";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "Noor | Your Quran. Your Salah. Your Journey.",
  description: "A peaceful Quran and salah companion.",
};

// viewportFit: "cover" is required for env(safe-area-inset-*) to resolve to
// real values on iOS (notch/home-indicator) instead of 0.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <RuntimePolish />
        <QuietProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </QuietProvider>
      </body>
    </html>
  );
}
