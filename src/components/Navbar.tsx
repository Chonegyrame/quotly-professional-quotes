import { Link, useLocation } from 'react-router-dom';
import { FileText, LayoutDashboard, Settings, Plus, BarChart3, BookTemplate, Package, LogOut, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inbox', icon: Inbox, label: 'Förfrågningar' },
  { to: '/analytics', icon: BarChart3, label: 'Analys' },
  { to: '/templates', icon: BookTemplate, label: 'Mallar' },
  { to: '/materials', icon: Package, label: 'Material' },
  { to: '/settings', icon: Settings, label: 'Inställningar' },
];

export function Navbar() {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-40 hidden md:flex items-center justify-between border-b bg-card px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-bold text-foreground">Quotly</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}>
              <Button
                variant={location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(`${item.to}/`)) ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
          <Button variant="ghost" size="sm" className="ml-2 gap-2 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t bg-card px-2 py-1 safe-area-bottom">
        {[navItems[0], navItems[1], navItems[4]].map((item) => (
          <Link key={item.to} to={item.to} className="flex-1">
            <button className={cn(
              'flex w-full flex-col items-center gap-0.5 py-2 text-xs',
              location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(`${item.to}/`)) ? 'text-primary font-semibold' : 'text-muted-foreground'
            )}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          </Link>
        ))}
        <Link to="/quotes/new" className="flex-1">
          <button className="flex w-full flex-col items-center gap-0.5 py-2 text-xs text-accent font-semibold" aria-label="Ny offert">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
              <Plus className="h-5 w-5 text-accent-foreground" />
            </div>
          </button>
        </Link>
      </nav>
    </>
  );
}

