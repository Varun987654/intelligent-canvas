import type { Metadata } from "next";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ClientProvider from "@/components/ClientProvider";

export const metadata: Metadata = {
  title: "Intelligent Canvas",
  description: "AI-powered collaborative whiteboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientProvider session={session}>
          {children}
        </ClientProvider>
      </body>
    </html>
  );
}