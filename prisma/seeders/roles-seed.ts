import fs from 'fs';
import path from 'path';

type RoleRecord = {
  key: string;
};

type CreateManyResult = {
  count: number;
};

type RolesSeederPrisma = {
  role: {
    findMany: (args: {
      where: {
        key: {
          in: string[];
        };
      };
      select: {
        key: true;
      };
    }) => Promise<RoleRecord[]>;
    createMany: (args: {
      data: RoleSeed[];
      skipDuplicates?: boolean;
    }) => Promise<CreateManyResult>;
  };
};

interface RoleSeed {
  name: string;
  key: string;
}

interface RolesFile {
  data: RoleSeed[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw) as unknown;
}

function parseRolesFile(raw: string): RolesFile {
  const parsed = parseJson(raw);

  if (!isObject(parsed) || !Array.isArray(parsed.data)) {
    throw new Error('Invalid roles.json format');
  }

  const data = parsed.data.map((item) => {
    if (!isObject(item)) {
      throw new Error('Invalid role entry in roles.json');
    }

    const name = item.name;
    const key = item.key;

    if (typeof name !== 'string' || typeof key !== 'string') {
      throw new Error('Invalid role entry fields in roles.json');
    }

    return { name, key };
  });

  return { data };
}

export async function rolesSeed(prisma: RolesSeederPrisma) {
  const rolesPath = path.resolve(__dirname, 'data', 'roles.json');
  const rolesRaw = fs.readFileSync(rolesPath, 'utf-8');
  const rolesFile = parseRolesFile(rolesRaw);
  const roles = rolesFile.data;

  // check if roles already exist
  const existingRoles = await prisma.role.findMany({
    where: {
      key: {
        in: roles.map((role) => role.key),
      },
    },
    select: {
      key: true,
    },
  });
  const existingRoleKeys = existingRoles.map((role) => role.key);
  const newRoles = roles.filter((role) => !existingRoleKeys.includes(role.key));
  if (newRoles.length === 0) {
    console.log('⚠️  All roles already exist. Skipping.');
    return;
  }
  // create new roles

  await prisma.role.createMany({
    data: newRoles,
    skipDuplicates: true,
  });

  console.log(`✅ ${newRoles.length} new roles seeded`);
}
