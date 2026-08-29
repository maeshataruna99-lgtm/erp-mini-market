export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: ApiMeta;
  timestamp: string;
  errors?: unknown;
}

export class ResponseHelper {
  static success<T>(data: T, message = 'Success', meta?: ApiMeta): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  static error(message: string, errors?: unknown, meta?: ApiMeta): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      meta,
      timestamp: new Date().toISOString(),
      errors,
    };
  }
}
