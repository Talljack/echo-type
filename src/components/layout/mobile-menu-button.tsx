import { Menu } from 'lucide-react';

interface MobileMenuButtonProps {
  onClick: () => void;
}

export function MobileMenuButton({ onClick }: MobileMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed top-4 left-4 z-30 md:hidden flex items-center justify-center w-11 h-11 rounded-lg bg-white border border-slate-200 shadow-sm active:scale-95 transition-transform"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5 text-slate-600" />
    </button>
  );
}
