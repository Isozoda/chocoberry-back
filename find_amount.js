const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAmount() {
  try {
    const amount = 19705.30;
    
    const expenses = await prisma.expense.findMany({
      where: { amount: amount }
    });
    
    const sales = await prisma.sale.findMany({
      where: { total: amount }
    });

    console.log('--- Expenses ---');
    console.log(JSON.stringify(expenses, null, 2));
    
    console.log('--- Sales ---');
    console.log(JSON.stringify(sales, null, 2));

    // Also check aggregates for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthExp = await prisma.expense.aggregate({
      where: { date: { gte: startOfMonth } },
      _sum: { amount: true }
    });
    
    const monthSales = await prisma.sale.aggregate({
      where: { date: { gte: startOfMonth }, status: 'COMPLETED' },
      _sum: { total: true }
    });

    console.log('--- Monthly Aggregates ---');
    console.log('Total Month Expenses:', monthExp._sum.amount);
    console.log('Total Month Sales:', monthSales._sum.total);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

findAmount();
