'use client';

import { ROLES, ROLE_LABELS, type Role } from '@/lib/curation/types';

export function RolePicker({
  value,
  onChange,
}: {
  value: Role | null;
  onChange: (r: Role) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ROLES.map((r) => {
        const active = value === r;
        return (
          <button
            key={r}
            onClick={() => onChange(r)}
            className={[
              'rounded-full px-3 py-1 text-sm font-medium transition',
              active
                ? 'bg-blue-600 text-white shadow'
                : 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700',
            ].join(' ')}
          >
            {ROLE_LABELS[r]}
          </button>
        );
      })}
    </div>
  );
}
