import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntentLink Campus",
  description:
    "IntentLink Campus helps students discover collaborators, build communities, and ship meaningful college work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="body-shell">{children}</body>
    </html>
  );
}
