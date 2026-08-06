export interface PaginationParams {
  page: number;
  pageSize: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 25));
  return { page, pageSize };
}

export function toSkipTake({ page, pageSize }: PaginationParams) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function paginationMeta({ page, pageSize }: PaginationParams, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
