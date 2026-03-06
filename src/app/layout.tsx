import "./globals.css";
import PageTransition from "../components/PageTransition";
import AppShell from "../components/AppShell";

export const metadata = {
  title: "Milk Tracker",
  description: "Milk tracking and billing system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>

      <body className="min-h-screen flex flex-col bg-gray-50">
        <AppShell>
          <PageTransition>{children}</PageTransition>
        </AppShell>
      </body>
    </html>
  );
}