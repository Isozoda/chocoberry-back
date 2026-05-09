const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInventory() {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { name: { contains: 'клубника', mode: 'insensitive' } }
    });
    console.log(JSON.stringify(items, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkInventory();
