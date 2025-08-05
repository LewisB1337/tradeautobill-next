import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer>
      <div className="container">
        <p>© {year} Tradeautobill. <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/faq">FAQ</Link></p>
      </div>
    </footer>
  );
}
