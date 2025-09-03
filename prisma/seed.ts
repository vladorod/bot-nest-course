import { PrismaClient, PlanType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      code: 'ONE',
      name: 'Один расклад',
      description: 'Разовая покупка: 1 расклад (1 кредит).',
      priceRub: 99,
      type: PlanType.SINGLE,
      creditsReward: 1,
      periodDays: null,
      periodQuota: null,
    },
    {
      code: 'FIVE',
      name: '5 раскладов',
      description: 'Пакет: 5 раскладов (5 кредитов).',
      priceRub: 299,
      type: PlanType.PACKAGE,
      creditsReward: 5,
      periodDays: null,
      periodQuota: null,
    },
    {
      code: 'SUB_MONTH',
      name: 'Подписка на месяц',
      description: '30 дней. Квота не ограничена (безлимит).',
      priceRub: 399,
      type: PlanType.SUBSCRIPTION,
      creditsReward: null,
      periodDays: 30,
      periodQuota: null, // null = безлимит
    },
    // если захочешь лимит по подписке:
    // {
    //   code: 'SUB_MONTH_LIMITED',
    //   name: 'Подписка на месяц (30 кредитов)',
    //   description: '30 дней, квота 30 раскладов/кредитов.',
    //   priceRub: 349,
    //   type: PlanType.SUBSCRIPTION,
    //   creditsReward: null,
    //   periodDays: 30,
    //   periodQuota: 30,
    // },
  ] as const;

  await Promise.all(
    plans.map((p) =>
      prisma.plan.upsert({
        where: { code: p.code },
        create: p,
        // апдейтим всё важное, createdAt не трогаем
        update: {
          name: p.name,
          description: p.description,
          priceRub: p.priceRub,
          type: p.type,
          creditsReward: p.creditsReward,
          periodDays: p.periodDays,
          periodQuota: p.periodQuota,
        },
      }),
    ),
  );

  const count = await prisma.plan.count();
  console.log(`✅ Seed done. Plans in DB: ${count}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });