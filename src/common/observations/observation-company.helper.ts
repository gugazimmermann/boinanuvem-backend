import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

export async function getUserCompanyIdOrThrow(
  prisma: PrismaService,
  userId: string,
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  return user.companyId;
}
