import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request?.method ?? '-';
    const url = request?.url ?? '-';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => console.log(`${method} ${url} — ${Date.now() - start}ms`),
        error: (err) => console.error(`${method} ${url} — error: ${err?.message}`),
      }),
    );
  }
}
