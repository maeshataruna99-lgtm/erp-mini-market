import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ApiResponse, ResponseHelper } from '../helpers/response.helper';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data !== null && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data as unknown as ApiResponse<T>;
        }
        if (data instanceof Buffer || data instanceof Uint8Array) {
          return data as unknown as ApiResponse<T>;
        }
        return ResponseHelper.success(data);
      }),
    );
  }
}
