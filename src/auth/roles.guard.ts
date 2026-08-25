import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.get<string[]>('roles', ctx.getHandler())
      ?? this.reflector.get<string[]>('roles', ctx.getClass());
    if (!roles) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!roles.includes(user?.role)) throw new ForbiddenException();
    return true;
  }
}
