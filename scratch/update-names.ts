import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
  const businesses = await prisma.business.findMany();

  for (const business of businesses) {
    const bid = business.id;
    console.log(`Updating business: ${business.name} (${bid})`);

    const existingEmployees = await prisma.employee.findMany({ 
      where: { businessId: bid },
      orderBy: { createdAt: 'asc' }
    });
    
    const newEmployees = [
      { name: 'Сафиалло', role: 'OWNER', isOwner: true, salary: 500, salaryType: 'DAILY' },
      { name: 'Шамс', role: 'OWNER', isOwner: true, salary: 500, salaryType: 'DAILY' },
      { name: 'Эҳсон', role: 'STAFF', isOwner: false },
      { name: 'Шоди', role: 'STAFF', isOwner: false },
      { name: 'Меҳрубон', role: 'STAFF', isOwner: false },
      { name: 'Наимшоҳ', role: 'STAFF', isOwner: false, isConsumableBuyer: true },
      { name: 'Фаррух', role: 'STAFF', isOwner: false, isConsumableBuyer: true },
      { name: 'Шодрӯз', role: 'STAFF', isOwner: false },
      { name: 'Шуҳрат', role: 'STAFF', isOwner: false },
      { name: 'Ҷовидон', role: 'STAFF', isOwner: false },
      { name: 'Муҳаммад', role: 'STAFF', isOwner: false },
    ];

    for (let i = 0; i < newEmployees.length; i++) {
      const emp = newEmployees[i];
      if (i < existingEmployees.length) {
        console.log(`Updating employee ${existingEmployees[i].name} -> ${emp.name}`);
        await prisma.employee.update({
          where: { id: existingEmployees[i].id },
          data: {
            name: emp.name,
            role: emp.role,
            isOwner: emp.isOwner,
            salary: new Decimal(emp.salary || 0),
            salaryType: (emp.salaryType as any) || 'MONTHLY',
            isConsumableBuyer: emp.isConsumableBuyer || false,
          }
        });
      } else {
        console.log(`Creating employee ${emp.name}`);
        await prisma.employee.create({
          data: {
            businessId: bid,
            name: emp.name,
            role: emp.role,
            isOwner: emp.isOwner,
            salary: new Decimal(emp.salary || 0),
            salaryType: (emp.salaryType as any) || 'MONTHLY',
            isConsumableBuyer: emp.isConsumableBuyer || false,
          }
        });
      }
    }

    // Update Suppliers
    const suppliers = await prisma.supplier.findMany({ where: { businessId: bid } });
    for (const s of suppliers) {
      if (s.name === 'Намк' || s.name === 'Namk') {
        console.log(`Updating supplier ${s.name} -> Наимшоҳ`);
        await prisma.supplier.update({ where: { id: s.id }, data: { name: 'Наимшоҳ' } });
      } else if (s.name === 'Баҳрулло' || s.name === 'Bahrullo') {
        console.log(`Updating supplier ${s.name} -> Фаррух`);
        await prisma.supplier.update({ where: { id: s.id }, data: { name: 'Фаррух' } });
      }
    }
  }

  console.log('Update complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
