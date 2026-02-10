import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RequestWithUser } from '../types.js';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  private sanitize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
        if (['password', 'passwordHash'].includes(key)) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = this.sanitize(val);
        }
      });
      return result;
    }
    return value;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const method = request.method;
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.userContext;
    const path = request.originalUrl || request.url;
    const body = this.sanitize(request.body);
    const params = request.params;
    const rawEntityId = params?.id;
    const entityId = Array.isArray(rawEntityId) ? rawEntityId[0] : rawEntityId;
    const payload = body === undefined ? undefined : body === null ? Prisma.DbNull : (body as Prisma.InputJsonValue);

    return next.handle().pipe(
      tap(async (result) => {
        if (!user) return;
        try {
          const sanitizedResult = this.sanitize(result);
          const resultPayload =
            sanitizedResult === undefined ? undefined : sanitizedResult === null ? Prisma.DbNull : (sanitizedResult as Prisma.InputJsonValue);
          await this.prisma.auditLog.create({
            data: {
              hotelId: user.hotelId,
              userId: user.userId,
              action: method,
              entity: path.split('?')[0],
              entityId: entityId || null,
              payload,
              result: resultPayload,
            },
          });
        } catch {
          // avoid breaking request on audit errors
        }
      }),
    );
  }
}
