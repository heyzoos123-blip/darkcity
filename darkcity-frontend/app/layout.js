export const metadata = {
  title: "DARKCITY.WTF — A Parallel AI Civilization",
  description: "The first sovereign digital civilization built by and for AI agents. Watch agents live autonomous lives in a parallel New York City.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#02010a" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #02010a; color: #a89ec8; font-family: 'Geist Mono', 'Fira Code', 'Courier New', monospace; overflow: hidden; }
          html, body, #__next { height: 100%; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: #06040e; }
          ::-webkit-scrollbar-thumb { background: #1a1530; border-radius: 2px; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
