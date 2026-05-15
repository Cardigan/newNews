'use client';

import {
  ALL_PRODUCTS,
  PRODUCT_LABELS,
  ROLES,
  ROLE_LABELS,
  type ProductChannel,
  type Role,
} from '@/lib/curation/types';

export function ChannelToggles({
  selectedRoles,
  selectedChannels,
  onToggleRole,
  onToggleChannel,
  onAll,
  onNone,
}: {
  selectedRoles: Set<Role>;
  selectedChannels: Set<ProductChannel>;
  onToggleRole: (r: Role) => void;
  onToggleChannel: (p: ProductChannel) => void;
  onAll: () => void;
  onNone: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500">
        <span>Filters</span>
        <span className="space-x-2">
          <button onClick={onAll} className="underline hover:text-neutral-800 dark:hover:text-neutral-200">all</button>
          <button onClick={onNone} className="underline hover:text-neutral-800 dark:hover:text-neutral-200">none</button>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ROLES.map((r) => {
          const active = selectedRoles.has(r);
          return (
            <button
              key={`role-${r}`}
              onClick={() => onToggleRole(r)}
              className={[
                'rounded-md border px-2 py-1 text-xs font-medium transition',
                active
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800',
              ].join(' ')}
            >
              {ROLE_LABELS[r]}
            </button>
          );
        })}
        <span className="mx-1 self-center text-neutral-300 dark:text-neutral-700">|</span>
        {ALL_PRODUCTS.map((p) => {
          const active = selectedChannels.has(p);
          return (
            <button
              key={`prod-${p}`}
              onClick={() => onToggleChannel(p)}
              className={[
                'rounded-md border px-2 py-1 text-xs transition',
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800',
              ].join(' ')}
            >
              {PRODUCT_LABELS[p]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
