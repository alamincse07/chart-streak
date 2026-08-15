export type QueryParams = {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  filter?: string; // simple case-insensitive substring search across all columns
};

export function parseQueryParams(searchParams: URLSearchParams): QueryParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get('pageSize') || '100', 10) || 100));
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortDir = (searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
  const filter = searchParams.get('filter') || undefined;
  return { page, pageSize, sortBy, sortDir, filter };
}

export function applyFilterSortPaginate(
  rows: Record<string, string | number | null>[],
  { page, pageSize, sortBy, sortDir, filter }: QueryParams
) {
  let result = rows;

  if (filter) {
    const needle = filter.toLowerCase();
    result = result.filter((row) =>
      Object.values(row).some((v) => v !== null && String(v).toLowerCase().includes(needle))
    );
  }

  if (sortBy) {
    result = [...result].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }

  const totalRows = result.length;
  const start = (page - 1) * pageSize;
  const pageRows = result.slice(start, start + pageSize);

  return { rows: pageRows, totalRows };
}
