import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ApiMeta, ApiResponse, ResponseHelper } from '../helpers/response.helper';

interface PaginatedShape<T> {
  items: T;
  meta: ApiMeta;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<unknown>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((data) => {
        if (data !== null && typeof data === 'object' && 'items' in data && 'meta' in data) {
          const paginated = data as PaginatedShape<T>;
          return ResponseHelper.success(paginated.items, 'Success', paginated.meta);
        }
        if (data !== null && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data as unknown as ApiResponse<unknown>;
        }
        if (data instanceof Buffer || data instanceof Uint8Array) {
          return data as unknown as ApiResponse<unknown>;
        }
        return ResponseHelper.success(data);
      }),
    );
  }
}
