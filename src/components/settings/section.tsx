import type React from 'react';

export function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section
      data-testid={`settings-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      aria-label={title}
      className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-line">
        <div>
          <Icon className="w-4 h-4 text-ink-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
        </div>
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}
