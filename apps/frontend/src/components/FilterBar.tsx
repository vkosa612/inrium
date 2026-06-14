'use client';

import { useRouter, usePathname } from 'next/navigation';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterField {
  param: string;
  placeholder: string;
  options?: FilterOption[];
  type?: 'select' | 'text';
}

interface Props {
  fields: FilterField[];
  activeValues: Record<string, string | undefined>;
  accentColor?: string;
}

export default function FilterBar({ fields, activeValues, accentColor = '#a78bfa' }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function updateParam(param: string, value: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(activeValues)) {
      if (v && k !== param) params.set(k, v);
    }
    if (value) params.set(param, value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasActiveFilters = Object.values(activeValues).some(Boolean);

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28, alignItems: 'center' }}>
      {fields.map((field) => {
        const current = activeValues[field.param] ?? '';

        if (field.type === 'text') {
          return (
            <div key={field.param} style={{ position: 'relative' }}>
              <input
                type="text"
                value={current}
                placeholder={field.placeholder}
                onChange={(e) => updateParam(field.param, e.target.value)}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${current ? accentColor + '60' : 'var(--border)'}`,
                  borderRadius: 8, color: 'var(--text)', fontSize: 13,
                  padding: '7px 32px 7px 12px', outline: 'none', minWidth: 180,
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = accentColor; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = current ? accentColor + '60' : 'var(--border)'; }}
              />
              {current && (
                <button onClick={() => updateParam(field.param, '')} type="button"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                  ✕
                </button>
              )}
            </div>
          );
        }

        // select
        return (
          <select
            key={field.param}
            value={current}
            onChange={(e) => updateParam(field.param, e.target.value)}
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${current ? accentColor + '60' : 'var(--border)'}`,
              borderRadius: 8, color: current ? 'var(--text)' : 'var(--text-muted)',
              fontSize: 13, padding: '7px 12px', outline: 'none', cursor: 'pointer',
              appearance: 'none', paddingRight: 28,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
            }}
          >
            <option value="">{field.placeholder}</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      })}

      {hasActiveFilters && (
        <button onClick={clearAll} type="button"
          style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
          ✕ Скинути фільтри
        </button>
      )}
    </div>
  );
}
