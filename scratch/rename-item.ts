import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const chatId = '8153281831'; // From previous logs
  
  // 1. Find the user
  const user = await prisma.user.findFirst({
    where: { telegramChatId: chatId }
  });

  if (!user) {
    console.error('User not found with chatId:', chatId);
    return;
  }

  // 2. Find the business
  const business = await prisma.business.findUnique({
    where: { userId: user.id }
  });

  if (!business) {
    console.error('Business not found for user:', user.id);
    return;
  }

  // 3. Find and update the item
  const item = await prisma.inventoryItem.findFirst({
    where: {
      businessId: business.id,
      name: { contains: 'Шоколад' }
    }
  });

  if (!item) {
    console.error('Item "Шоколад майда" not found');
    return;
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: item.id },
    data: { 
      name: 'Шоколад',
      nameTg: 'Шоколад',
      nameRu: 'Шоколад'
    }
  });

  console.log('Success! Item renamed to:', updated.name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
