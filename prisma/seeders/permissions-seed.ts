import fs from 'fs';
import path from 'path';

type PermissionRecord = {
  id: number;
  name: string;
  key: string;
  resource: string;
};

type RoleRecord = {
  id: number;
  name: string;
  key: string;
};

type RolePermissionRecord = {
  permissionId: number;
};

type CreateManyResult = {
  count: number;
};

type PermissionsSeederPrisma = {
  permission: {
    findMany: (args?: {
      where?: {
        key?: {
          in: string[];
        };
      };
    }) => Promise<PermissionRecord[]>;
    createMany: (args: {
      data: PermissionSeed[];
      skipDuplicates?: boolean;
    }) => Promise<CreateManyResult>;
  };
  role: {
    findMany: () => Promise<RoleRecord[]>;
  };
  rolePermission: {
    findMany: (args: {
      where: {
        roleId: number;
      };
    }) => Promise<RolePermissionRecord[]>;
    createMany: (args: {
      data: Array<{
        roleId: number;
        permissionId: number;
      }>;
      skipDuplicates?: boolean;
    }) => Promise<CreateManyResult>;
  };
};

interface PermissionSeed {
  name: string;
  key: string;
  resource: string;
}

interface PermissionsFile {
  data: PermissionSeed[];
}

interface RolePermissionsFile {
  data: Record<string, string[]>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw) as unknown;
}

function parsePermissionsFile(raw: string): PermissionsFile {
  const parsed = parseJson(raw);
  if (!isObject(parsed) || !Array.isArray(parsed.data)) {
    throw new Error('Invalid permissions.json format');
  }

  const data = parsed.data.map((item) => {
    if (!isObject(item)) {
      throw new Error('Invalid permission entry in permissions.json');
    }

    const name = item.name;
    const key = item.key;
    const resource = item.resource;

    if (
      typeof name !== 'string' ||
      typeof key !== 'string' ||
      typeof resource !== 'string'
    ) {
      throw new Error('Invalid permission entry fields in permissions.json');
    }

    return { name, key, resource };
  });

  return { data };
}

function parseRolePermissionsFile(raw: string): RolePermissionsFile {
  const parsed = parseJson(raw);
  if (!isObject(parsed) || !isObject(parsed.data)) {
    throw new Error('Invalid role-permissions.json format');
  }

  const mapped: Record<string, string[]> = {};
  for (const [roleKey, permissions] of Object.entries(parsed.data)) {
    if (
      !Array.isArray(permissions) ||
      !permissions.every((p) => typeof p === 'string')
    ) {
      throw new Error(
        'Invalid role-permissions entry in role-permissions.json',
      );
    }
    mapped[roleKey] = permissions;
  }

  return { data: mapped };
}

export async function permissionsSeed(prisma: PermissionsSeederPrisma) {
  // Seed permissions
  const permissionsPath = path.resolve(__dirname, 'data', 'permissions.json');
  const permissionsRaw = fs.readFileSync(permissionsPath, 'utf-8');
  const permissionsFile = parsePermissionsFile(permissionsRaw);
  const permissions = permissionsFile.data;

  // Check if permissions already exist
  const existingPermissions = await prisma.permission.findMany({
    where: {
      key: {
        in: permissions.map((permission) => permission.key),
      },
    },
  });

  const existingPermissionKeys = existingPermissions.map(
    (permission) => permission.key,
  );
  const newPermissions = permissions.filter(
    (permission) => !existingPermissionKeys.includes(permission.key),
  );

  if (newPermissions.length > 0) {
    await prisma.permission.createMany({
      data: newPermissions,
      skipDuplicates: true,
    });
    console.log(`✅ ${newPermissions.length} new permissions seeded`);
  } else {
    console.log('⚠️  All permissions already exist. Skipping.');
  }

  // Seed role-permission mappings
  const rolePermissionsPath = path.resolve(
    __dirname,
    'data',
    'role-permissions.json',
  );
  const rolePermissionsRaw = fs.readFileSync(rolePermissionsPath, 'utf-8');
  const rolePermissionsFile = parseRolePermissionsFile(rolePermissionsRaw);
  const rolePermissions = rolePermissionsFile.data;

  // Get all roles and permissions
  const roles = await prisma.role.findMany();
  const allPermissions = await prisma.permission.findMany();

  for (const [roleKey, permissionKeys] of Object.entries(rolePermissions)) {
    const role = roles.find((r) => r.key === roleKey);
    if (!role) {
      console.log(`⚠️  Role ${roleKey} not found. Skipping.`);
      continue;
    }

    // Get permissions for this role
    const rolePermissionRecords = allPermissions.filter((p) =>
      permissionKeys.includes(p.key),
    );

    // Check existing role-permission mappings
    const existingMappings = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
    });

    const existingPermissionIds = existingMappings.map((m) => m.permissionId);

    // Create new mappings
    const newMappings = rolePermissionRecords
      .filter((p) => !existingPermissionIds.includes(p.id))
      .map((p) => ({
        roleId: role.id,
        permissionId: p.id,
      }));

    if (newMappings.length > 0) {
      await prisma.rolePermission.createMany({
        data: newMappings,
        skipDuplicates: true,
      });
      console.log(
        `✅ ${newMappings.length} permissions assigned to role ${role.name}`,
      );
    } else {
      console.log(
        `⚠️  All permissions already assigned to role ${role.name}. Skipping.`,
      );
    }
  }

  console.log('✅ Role-permissions seeded');
}
