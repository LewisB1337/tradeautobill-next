import Link from 'next/link';

export default function Header() {
  return (
    <nav className="nav container" aria-label="Top">
      <div className="logo">
        <Link href="/">Tradeautobill</Link>
      </div>
      <div className="row">
        <Link className="btn" href="/pricing">Pricing</Link>
        <Link className="btn" href="/account">Account</Link>
      </div>
    </nav>
  );
}
