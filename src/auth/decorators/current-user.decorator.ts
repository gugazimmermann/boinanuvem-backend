import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  companyId: string;
  mainUser: boolean;
  permissions: Record<string, unknown>;
  company: unknown;
}

interface RequestWithUser {
  user: CurrentUser;
}

export const GetCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
