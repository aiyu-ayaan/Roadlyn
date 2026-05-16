import { PrismaClient } from '@prisma/client';
import { createTokenSecret, hashSecret, verifySecret } from '../utils/crypto';

export class OAuthService {
  constructor(private readonly db: PrismaClient) {}

  async createClient(input: {
    name: string;
    userId?: string;
    scopes?: string[];
  }) {
    const clientSecret = createTokenSecret();
    const client = await this.db.oAuthClient.create({
      data: {
        name: input.name,
        clientId: `rlyn_${createTokenSecret(18)}`,
        clientSecretHash: hashSecret(clientSecret),
        userId: input.userId,
        scopes: input.scopes ?? ['ai:read', 'ai:write'],
      },
      select: {
        id: true,
        name: true,
        clientId: true,
        scopes: true,
        userId: true,
        createdAt: true,
      },
    });

    return {
      ...client,
      clientSecret,
    };
  }

  async validateClient(clientId: string, clientSecret: string) {
    const client = await this.db.oAuthClient.findUnique({
      where: { clientId },
    });

    if (
      !client ||
      !client.isActive ||
      !verifySecret(clientSecret, client.clientSecretHash)
    ) {
      return null;
    }

    return {
      id: client.id,
      clientId: client.clientId,
      userId: client.userId,
      scopes: client.scopes,
    };
  }
}
