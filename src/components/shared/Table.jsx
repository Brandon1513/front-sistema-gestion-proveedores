import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export const Table = ({
  columns, rows, empty, rowKey = (row) => row.id,
  expandable = false, expandedKey = null, onRowClick = null, renderExpanded = null,
}) => {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const sortedRows = useMemo(() => {
    if (!rows) return [];
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.accessor) return rows;
    const sorted = [...rows].sort((a, b) => {
      const va = col.accessor(a);
      const vb = col.accessor(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') return va.localeCompare(vb);
      return va - vb;
    });
    return sortDir === 'asc' ? sorted : sorted.reverse();
  }, [rows, sortKey, sortDir, columns]);

  const handleSort = (col) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  if (!rows || rows.length === 0) {
    return <div className="py-16 text-center text-gray-400">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col)}
                className={`px-4 py-3 text-xs font-semibold tracking-wide text-left text-gray-500 uppercase ${
                  col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''
                }`}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {col.sortable && sortKey !== col.key && (
                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedRows.map((row) => {
            const key = rowKey(row);
            const isExpanded = expandable && expandedKey === key;
            return (
              <React.Fragment key={key}>
                <tr
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-gray-50 ${expandable ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">{col.render(row)}</td>
                  ))}
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-2 border-t border-gray-100 bg-gray-50">
                      {renderExpanded(row)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};