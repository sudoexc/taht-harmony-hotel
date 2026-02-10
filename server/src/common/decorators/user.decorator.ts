import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '../types.js';

export const CurrentUser = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  return request.userContext;
});
