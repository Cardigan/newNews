'use client';

import {
  ALL_PRODUCTS,
  PRODUCT_LABELS,
  type ProductChannel,
} from '@/lib/curation/types';

export function ChannelToggles({
  selected,
  onToggle,
  onAll,
  onNone,
}: {
  selected: Set<ProductChannel>;
  onToggle: (p: ProductChannel) => void;
  onAll: () => void;
  onNone: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500">
        <span>Product channels</span>
        <span className="space-x-2">
          <button onClick={onAll} className="underline hover:text-neutral-800 dark:hover:text-neutral-200">all</button>
          <button onClick={onNone} className="underline hover:text-neutral-800 dark:hover:text-neutral-200">none</button>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_PRODUCTS.map((p) => {
          const active = selected.has(p);
          return (
            <button
              key={p}
              onClick={() => onToggle(p)}
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
