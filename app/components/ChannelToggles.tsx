'use client';

import {
  ALL_PRODUCTS,
  PRODUCT_LABELS,
  ROLES,
  ROLE_LABELS,
  type ProductChannel,
  type Role,
} from '@/lib/curation/types';
import { playTick } from '@/lib/sounds';

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
      <div className="flex items-center justify-between">
        <span className="pixel-label text-ink/70">Filters</span>
        <span className="flex items-center gap-2">
          <button
            onClick={() => { playTick(); onAll(); }}
            className="nes-btn nes-btn--success"
          >
            All
          </button>
          <button
            onClick={() => { playTick(); onNone(); }}
            className="nes-btn"
          >
            None
          </button>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ROLES.map((r) => {
          const active = selectedRoles.has(r);
          return (
            <button
              key={`role-${r}`}
              onClick={() => { playTick(); onToggleRole(r); }}
              data-pressed={active}
              className={`nes-btn ${active ? 'nes-btn--success' : ''}`}
            >
              {ROLE_LABELS[r]}
            </button>
          );
        })}
        <span className="mx-1 self-center font-pixel text-[10px] text-ink/40">|</span>
        {ALL_PRODUCTS.map((p) => {
          const active = selectedChannels.has(p);
          return (
            <button
              key={`prod-${p}`}
              onClick={() => { playTick(); onToggleChannel(p); }}
              data-pressed={active}
              className={`nes-btn ${active ? 'nes-btn--primary' : ''}`}
            >
              {PRODUCT_LABELS[p]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

