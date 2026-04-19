import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { usersSeed } from './user-seed';
import { PrismaPg } from '@prisma/adapter-pg';
import { permissionsSeed } from './permissions-seed';
import { rolesSeed } from './roles-seed';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Mulai seeding database...\n');
  await rolesSeed(prisma);
  await permissionsSeed(prisma);
  await usersSeed(prisma);

  console.log('\n🎉 Seeding selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
