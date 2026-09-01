"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  ["⌂", "Home", "/"], ["☰", "Quran", "/quran"], ["✧", "Learn", "/learn"], ["▧", "Vision", "/vision"], ["◷", "Prayer", "/prayer"], ["◎", "Qibla", "/qibla"], ["◇", "Utilities", "/utilities"],
    ["♧", "Family", "/family"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/salah") return <>{children}</>;
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span>ن</span>
          <div>
            <b>Noor</b>
            <small>Your journey, gently guided.</small>
          </div>
        </Link>
        <nav>
          {navigation.map(([icon, label, href]) => (
            <Link className={isActive(href) ? "active-nav" : ""} key={href} href={href}>
              <i>{icon}</i>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/settings">⚙ <span>Settings</span></Link>
          <Link href="/profile" className="profile-mini">
            <span>NA</span>
            <span>
              <b>Noor A.</b>
              <small>Adult beginner</small>
            </span>
          </Link>
        </div>
      </aside>
      <div className="mobile-brand">
        <Link href="/" className="brand">
          <span>ن</span>
          <b>Noor</b>
        </Link>
        <Link href="/settings">⚙</Link>
      </div>
      <div className="content-area">{children}</div>
      {/* Phone/tablet nav -- the sidebar is hidden below 800px, so this is the
          only way to reach any page besides Home/Settings on a small screen. */}
      <nav className="mobile-tabbar">
        {navigation.map(([icon, label, href]) => (
          <Link className={isActive(href) ? "active-nav" : ""} key={href} href={href}>
            <i>{icon}</i>
            <small>{label}</small>
          </Link>
        ))}
      </nav>
    </div>
  );
}
