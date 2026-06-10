import './globals.css';

export const metadata = {
  title: 'Gradient Ascent — Math for AI',
  description: 'Gamified, interactive linear algebra and calculus for engineers heading toward AI research.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
