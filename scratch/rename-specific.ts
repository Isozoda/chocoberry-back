import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const itemId = '292dc9bb-58b0-4736-9213-07fd765af994'; // The ID for "Шоколад майда"
  
  const updated = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { 
      name: 'Шоколад',
      nameTg: 'Шоколад',
      nameRu: 'Шоколад'
    }
  });

  console.log('Success! Item with ID', itemId, 'renamed to:', updated.name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
