export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class PaginationHelper {
  static normalize(page?: number, limit?: number, maxLimit = 100): PaginationParams {
    const safePage = page && page > 0 ? Math.floor(page) : 1;
    const safeLimit = limit && limit > 0 ? Math.min(Math.floor(limit), maxLimit) : 20;
    return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
  }

  static buildMeta(page: number, limit: number, total: number): PaginationMeta {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
