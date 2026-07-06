import './globals.css';

export const metadata = {
  title: 'Lattice — the math beneath machine learning',
  description: 'Interactive linear algebra, calculus, probability, and optimization — the math behind modern AI, learned by doing.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
