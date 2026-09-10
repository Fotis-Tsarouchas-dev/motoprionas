'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setMenuOpen(false);

    let active = true;

    fetch('/api/auth/me', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (!active) return;

        if (!response.ok) {
          setIsAdmin(false);
          return;
        }

        const data = (await response.json()) as {
          user?: { roles?: string[] };
        };

        setIsAdmin(Boolean(data.user?.roles?.includes('admin')));
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="container nav">
        <Link className="brand" href="/" onClick={closeMenu}>
          <Image
            src="/motoprionas-logo.png"
            width={560}
            height={340}
            alt="Moto Prionas"
            priority
          />
        </Link>

        <nav className="menu" aria-label="Κύρια πλοήγηση">
          <Link href="/">ΑΡΧΙΚΗ</Link>
          <Link href="/axesouar-antallaktika">
            ΑΞΕΣΟΥΑΡ - ΑΝΤΑΛΛΑΚΤΙΚΑ
          </Link>
          <Link href="/epikoinonia">ΕΠΙΚΟΙΝΩΝΙΑ</Link>
          {isAdmin && (
            <Link className="admin-nav-link" href="/admin">
              ΔΙΑΧΕΙΡΙΣΗ
            </Link>
          )}
        </nav>

        <div className="mobile-menu">
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={menuOpen ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          {menuOpen && (
            <nav
              id="mobile-navigation"
              className="mobile-menu-panel"
              aria-label="Κύρια πλοήγηση κινητού"
            >
              <Link href="/" onClick={closeMenu}>
                ΑΡΧΙΚΗ
              </Link>
              <Link href="/axesouar-antallaktika" onClick={closeMenu}>
                ΑΞΕΣΟΥΑΡ - ΑΝΤΑΛΛΑΚΤΙΚΑ
              </Link>
              <Link href="/epikoinonia" onClick={closeMenu}>
                ΕΠΙΚΟΙΝΩΝΙΑ
              </Link>
              {isAdmin && (
                <Link
                  className="admin-nav-link"
                  href="/admin"
                  onClick={closeMenu}
                >
                  ΠΙΝΑΚΑΣ ΕΛΕΓΧΟΥ
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
