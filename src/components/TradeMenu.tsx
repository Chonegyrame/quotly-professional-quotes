import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const tradeLinks = [
  { label: 'Bygg', to: '/bygg' },
  { label: 'VVS', to: '/vvs' },
  { label: 'El', to: '/el' },
  { label: 'Övrigt', to: '/ovrigt' },
];

export function TradeMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-foreground hover:bg-stone-50"
        aria-label="Branscher"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.25, 0.4, 0, 1] }}
            className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-xl border border-stone-100 bg-white shadow-lg"
          >
            {tradeLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-stone-50 hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
