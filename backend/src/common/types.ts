import { AppRole } from '@prisma/client';
import { Request } from 'express';

export interface UserContext {
  userId: string;
  hotelId: string;
  role: AppRole;
  email: string;
  fullName: string;
}

export interface RequestWithUser extends Request {
  user?: { sub: string; email: string };
  userContext?: UserContext;
}
