import * as bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

type EmptyUpdate = Record<string, never>;

type BcryptApi = {
  hash: (value: string, saltRounds: number) => Promise<string>;
};

const bcryptHash = (bcrypt as unknown as BcryptApi).hash;

type RoleLookup = {
  id: number;
};

type UsersSeederPrisma = {
  role: {
    findFirst: (args: {
      where: {
        key: string;
      };
      select: {
        id: true;
      };
    }) => Promise<RoleLookup | null>;
  };
  user: {
    upsert: (args: {
      where: {
        email: string;
      };
      update: EmptyUpdate;
      create: {
        name: string;
        email: string;
        password: string;
        phoneNumber: string;
        avatar?: string;
        roleId: number;
      };
    }) => Promise<unknown>;
  };
};

interface UserSeed {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  avatar?: string;
  roleKey: string;
}

interface UsersFile {
  data: UserSeed[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw) as unknown;
}

function parseUsersFile(raw: string): UsersFile {
  const parsed = parseJson(raw);

  if (!isObject(parsed) || !Array.isArray(parsed.data)) {
    throw new Error('Invalid users.json format');
  }

  const data = parsed.data.map((item) => {
    if (!isObject(item)) {
      throw new Error('Invalid user entry in users.json');
    }

    const name = item.name;
    const email = item.email;
    const password = item.password;
    const phoneNumber = item.phoneNumber;
    const roleKey = item.roleKey;
    const avatar = item.avatar;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof phoneNumber !== 'string' ||
      typeof roleKey !== 'string'
    ) {
      throw new Error('Invalid user entry fields in users.json');
    }

    if (avatar !== undefined && typeof avatar !== 'string') {
      throw new Error('Invalid avatar field in users.json');
    }

    return {
      name,
      email,
      password,
      phoneNumber,
      roleKey,
      avatar,
    };
  });

  return { data };
}

export async function usersSeed(prisma: UsersSeederPrisma) {
  const usersPath = path.resolve(__dirname, 'data', 'users.json');
  const usersRaw = fs.readFileSync(usersPath, 'utf-8');

  const usersFile = parseUsersFile(usersRaw);

  const users = usersFile.data;

  for (const user of users) {
    const role = await prisma.role.findFirst({
      where: { key: user.roleKey },
      select: { id: true },
    });

    if (!role) {
      console.warn(`⚠️ Role ${user.roleKey} not found`);
      continue;
    }

    const hashedPassword = await bcryptHash(user.password, 12);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar,
        roleId: role.id,
      },
    });

    console.log(`✅ User ${user.email} seeded`);
  }
}
