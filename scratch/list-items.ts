import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const chatId = '8153281831';
  
  const user = await prisma.user.findFirst({
    where: { telegramChatId: chatId }
  });

  if (!user) {
    console.error('User not found');
    return;
  }

  const business = await prisma.business.findUnique({
    where: { userId: user.id }
  });

  if (!business) {
    console.error('Business not found');
    return;
  }

  const items = await prisma.inventoryItem.findMany({
    where: { businessId: business.id }
  });

  console.log('Your inventory items:');
  items.forEach(item => {
    console.log(`- ID: ${item.id} | Name: "${item.name}" | Unit: ${item.unit}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
