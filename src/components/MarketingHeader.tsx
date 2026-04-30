import { Link, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TradeMenu } from '@/components/TradeMenu';

const NAV_LINKS = [
  { label: 'Bygg', to: '/bygg' },
  { label: 'VVS', to: '/vvs' },
  { label: 'El', to: '/el' },
  { label: 'Övrigt', to: '/ovrigt' },
  { label: 'Priser', to: '/pris' },
] as const;

export function MarketingHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
      className="sticky top-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-md"
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:pl-32 lg:pr-32">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="font-heading text-xl font-bold text-foreground">Quotly</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-accent' : 'text-stone-700 hover:text-orange-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/auth">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button variant="ghost" size="sm" className="text-sm font-medium">
                Logga in
              </Button>
            </motion.div>
          </Link>
          <Link to="/auth?signup=true">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button size="sm" className="gap-1.5 bg-accent text-white hover:bg-accent/90">
                Kom igång gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </Link>
          <div className="md:hidden">
            <TradeMenu />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
