import { useMemo, useState, type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  /** Value used for sorting. Omit to make the column unsortable. */
  sort?: (row: T) => number | string | null;
  align?: 'right';
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  filterText?: (row: T) => string;
  caption: string;
  emptyText?: string;
  pageSize?: number;
}

/** Sortable, filterable table. Nulls always sort last so missing data never looks like a leader. */
export function DataTable<T>({ rows, columns, rowKey, initialSort, filterText, caption, emptyText = 'Nothing to show.', pageSize = 50 }: Props<T>) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [filter, setFilter] = useState('');
  const [limit, setLimit] = useState(pageSize);

  const shown = useMemo(() => {
    let out = rows;
    if (filter && filterText) {
      const q = filter.trim().toLowerCase();
      out = out.filter((r) => filterText(r).toLowerCase().includes(q));
    }
    const col = sort ? columns.find((c) => c.key === sort.key) : undefined;
    if (col?.sort && sort) {
      const dir = sort.dir === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => {
        const va = col.sort!(a);
        const vb = col.sort!(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
      });
    }
    return out;
  }, [rows, columns, sort, filter, filterText]);

  return (
    <div>
      {filterText && (
        <div style={{ marginBottom: 8, maxWidth: 280 }}>
          <label className="sr-only" htmlFor={`f-${caption}`}>Filter {caption}</label>
          <input id={`f-${caption}`} className="input" placeholder="Filter…" value={filter} onChange={(e) => { setFilter(e.target.value); setLimit(pageSize); }} />
        </div>
      )}
      <div className="table-wrap">
        <table className="t">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} className={c.align === 'right' ? 'r' : ''} aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.sort ? (
                      <button type="button" onClick={() => setSort(active && sort!.dir === 'desc' ? { key: c.key, dir: 'asc' } : { key: c.key, dir: 'desc' })}>
                        {c.label}{active ? (sort!.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                      </button>
                    ) : c.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, limit).map((r) => (
              <tr key={rowKey(r)}>
                {columns.map((c) => <td key={c.key} className={c.align === 'right' ? 'r num' : ''}>{c.render(r)}</td>)}
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={columns.length} className="muted">{emptyText}</td></tr>}
          </tbody>
        </table>
      </div>
      {shown.length > limit && (
        <p style={{ marginTop: 8 }}>
          <button type="button" className="btn small" onClick={() => setLimit(limit + pageSize)}>Show more ({shown.length - limit} remaining)</button>
        </p>
      )}
    </div>
  );
}
