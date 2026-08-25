import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('login')
  login(@Body() b: { email: string; password: string }) {
    return this.auth.login(b.email, b.password);
  }

  @Get('invite/:token')
  inviteInfo(@Param('token') token: string) {
    return this.auth.inviteInfo(token);
  }

  @Post('accept-invite')
  acceptInvite(@Body() b: { token: string; password: string }) {
    return this.auth.acceptInvite(b.token, b.password);
  }
}
