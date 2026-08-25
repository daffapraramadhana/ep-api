import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash)))
      throw new UnauthorizedException('Email atau password salah');
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role }),
      role: user.role, name: user.name,
    };
  }

  async inviteInfo(token: string) {
    if (!token || typeof token !== 'string')
      throw new NotFoundException('Undangan tidak ditemukan atau sudah dipakai');
    const u = await this.prisma.user.findFirst({
      where: { inviteToken: token, inviteStatus: 'PENDING' } });
    if (!u) throw new NotFoundException('Undangan tidak ditemukan atau sudah dipakai');
    return { name: u.name, email: u.email };
  }

  async acceptInvite(token: string, password: string) {
    if (!token || typeof token !== 'string')
      throw new NotFoundException('Undangan tidak ditemukan atau sudah dipakai');
    if (!password || password.length < 8)
      throw new BadRequestException('Password minimal 8 karakter');
    const u = await this.prisma.user.findFirst({
      where: { inviteToken: token, inviteStatus: 'PENDING' } });
    if (!u) throw new NotFoundException('Undangan tidak ditemukan atau sudah dipakai');
    const updated = await this.prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await bcrypt.hash(password, 10),
              inviteStatus: 'ACCEPTED', inviteToken: null },
    });
    return {
      accessToken: await this.jwt.signAsync({ sub: updated.id, role: updated.role }),
      role: updated.role, name: updated.name,
    };
  }
}
