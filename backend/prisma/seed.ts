import { PrismaClient, Role, AccountType, AccountNature } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface AccountSeed {
  code: string;
  name: string;
  type: AccountType;
  nature?: AccountNature;
  parentCode?: string;
}

const CHART_OF_ACCOUNTS: AccountSeed[] = [
  { code: '1', name: 'ACTIVO', type: AccountType.ACTIVO },
  { code: '1.1', name: 'ACTIVO CORRIENTE', type: AccountType.ACTIVO, parentCode: '1' },
  { code: '1.1.01', name: 'CAJA', type: AccountType.ACTIVO, parentCode: '1.1' },
  { code: '1.1.02', name: 'BANCOS', type: AccountType.ACTIVO, parentCode: '1.1' },
  {
    code: '1.1.03',
    name: 'CUENTAS POR COBRAR',
    type: AccountType.ACTIVO,
    parentCode: '1.1',
  },
  {
    code: '1.1.04',
    name: 'INVENTARIOS',
    type: AccountType.ACTIVO,
    parentCode: '1.1',
  },
  {
    code: '1.1.05',
    name: 'ITBMS ACREDITABLE',
    type: AccountType.ACTIVO,
    parentCode: '1.1',
  },
  {
    code: '1.1.06',
    name: 'GASTOS PAGADOS POR ANTICIPADO',
    type: AccountType.ACTIVO,
    parentCode: '1.1',
  },
  {
    code: '1.1.07',
    name: 'OTROS ACTIVOS CORRIENTES',
    type: AccountType.ACTIVO,
    parentCode: '1.1',
  },
  { code: '1.2', name: 'ACTIVO NO CORRIENTE', type: AccountType.ACTIVO, parentCode: '1' },
  { code: '1.2.01', name: 'TERRENOS', type: AccountType.ACTIVO, parentCode: '1.2' },
  { code: '1.2.02', name: 'EDIFICIOS', type: AccountType.ACTIVO, parentCode: '1.2' },
  {
    code: '1.2.03',
    name: 'MOBILIARIO Y EQUIPO',
    type: AccountType.ACTIVO,
    parentCode: '1.2',
  },
  {
    code: '1.2.04',
    name: 'EQUIPO DE COMPUTACIÓN',
    type: AccountType.ACTIVO,
    parentCode: '1.2',
  },
  { code: '1.2.05', name: 'VEHÍCULOS', type: AccountType.ACTIVO, parentCode: '1.2' },
  {
    code: '1.2.06',
    name: 'DEPRECIACIÓN ACUMULADA',
    type: AccountType.ACTIVO,
    nature: AccountNature.CREDITO,
    parentCode: '1.2',
  },
  {
    code: '1.2.07',
    name: 'OTROS ACTIVOS NO CORRIENTES',
    type: AccountType.ACTIVO,
    parentCode: '1.2',
  },
  { code: '2', name: 'PASIVO', type: AccountType.PASIVO },
  {
    code: '2.1',
    name: 'PASIVO CORRIENTE',
    type: AccountType.PASIVO,
    parentCode: '2',
  },
  {
    code: '2.1.01',
    name: 'CUENTAS POR PAGAR',
    type: AccountType.PASIVO,
    parentCode: '2.1',
  },
  {
    code: '2.1.02',
    name: 'ITBMS POR PAGAR (7%)',
    type: AccountType.PASIVO,
    parentCode: '2.1',
  },
  {
    code: '2.1.03',
    name: 'ISR POR PAGAR',
    type: AccountType.PASIVO,
    parentCode: '2.1',
  },
  {
    code: '2.1.04',
    name: 'CSS POR PAGAR',
    type: AccountType.PASIVO,
    parentCode: '2.1',
  },
  {
    code: '2.1.05',
    name: 'RER (SEGURO EDUCATIVO) POR PAGAR',
    type: AccountType.PASIVO,
    parentCode: '2.1',
  },
  {
    code: '2.1.06',
    name: 'DÉCIMO TERCER MES POR PAGAR',
    type: AccountType.PASIVO,
    parentCode: '2.1',
  },
  {
    code: '2.1.07',
    name: 'RETENCIONES POR PAGAR',
    type: AccountType.PASIVO,
    parentCode: '2.1',
  },
  {
    code: '2.1.08',
    name: 'OTROS PASIVOS CORRIENTES',
    type: AccountType.PASIVO,
    parentCode: '2.1',
  },
  {
    code: '2.2',
    name: 'PASIVO NO CORRIENTE',
    type: AccountType.PASIVO,
    parentCode: '2',
  },
  {
    code: '2.2.01',
    name: 'PRÉSTAMOS BANCARIOS A LARGO PLAZO',
    type: AccountType.PASIVO,
    parentCode: '2.2',
  },
  {
    code: '2.2.02',
    name: 'OTROS PASIVOS NO CORRIENTES',
    type: AccountType.PASIVO,
    parentCode: '2.2',
  },
  { code: '3', name: 'PATRIMONIO', type: AccountType.PATRIMONIO },
  { code: '3.1', name: 'CAPITAL', type: AccountType.PATRIMONIO, parentCode: '3' },
  {
    code: '3.1.01',
    name: 'CAPITAL SOCIAL',
    type: AccountType.PATRIMONIO,
    parentCode: '3.1',
  },
  {
    code: '3.1.02',
    name: 'APORTES ADICIONALES',
    type: AccountType.PATRIMONIO,
    parentCode: '3.1',
  },
  { code: '3.2', name: 'RESERVAS', type: AccountType.PATRIMONIO, parentCode: '3' },
  {
    code: '3.2.01',
    name: 'RESERVA LEGAL',
    type: AccountType.PATRIMONIO,
    parentCode: '3.2',
  },
  { code: '3.3', name: 'RESULTADOS', type: AccountType.PATRIMONIO, parentCode: '3' },
  {
    code: '3.3.01',
    name: 'UTILIDADES ACUMULADAS',
    type: AccountType.PATRIMONIO,
    parentCode: '3.3',
  },
  {
    code: '3.3.02',
    name: 'UTILIDAD DEL EJERCICIO',
    type: AccountType.PATRIMONIO,
    parentCode: '3.3',
  },
  {
    code: '3.3.03',
    name: 'PÉRDIDA DEL EJERCICIO',
    type: AccountType.PATRIMONIO,
    nature: AccountNature.DEBITO,
    parentCode: '3.3',
  },
  { code: '4', name: 'INGRESOS', type: AccountType.INGRESO },
  {
    code: '4.1',
    name: 'INGRESOS OPERACIONALES',
    type: AccountType.INGRESO,
    parentCode: '4',
  },
  {
    code: '4.1.01',
    name: 'VENTA DE BIENES',
    type: AccountType.INGRESO,
    parentCode: '4.1',
  },
  {
    code: '4.1.02',
    name: 'VENTA DE SERVICIOS',
    type: AccountType.INGRESO,
    parentCode: '4.1',
  },
  {
    code: '4.1.03',
    name: 'DEVOLUCIONES Y DESCUENTOS EN VENTAS',
    type: AccountType.INGRESO,
    nature: AccountNature.DEBITO,
    parentCode: '4.1',
  },
  {
    code: '4.2',
    name: 'OTROS INGRESOS',
    type: AccountType.INGRESO,
    parentCode: '4',
  },
  {
    code: '4.2.01',
    name: 'INGRESOS POR INTERESES',
    type: AccountType.INGRESO,
    parentCode: '4.2',
  },
  {
    code: '4.2.02',
    name: 'OTROS INGRESOS',
    type: AccountType.INGRESO,
    parentCode: '4.2',
  },
  { code: '5', name: 'COSTOS', type: AccountType.COSTO },
  {
    code: '5.1',
    name: 'COSTO DE VENTAS',
    type: AccountType.COSTO,
    parentCode: '5',
  },
  {
    code: '5.1.01',
    name: 'COMPRAS DE MERCANCÍAS',
    type: AccountType.COSTO,
    parentCode: '5.1',
  },
  {
    code: '5.1.02',
    name: 'COSTO DE VENTAS (INVENTARIO)',
    type: AccountType.COSTO,
    parentCode: '5.1',
  },
  {
    code: '5.1.03',
    name: 'COSTO DE SERVICIOS PRESTADOS',
    type: AccountType.COSTO,
    parentCode: '5.1',
  },
  { code: '6', name: 'GASTOS', type: AccountType.GASTO },
  {
    code: '6.1',
    name: 'GASTOS DE ADMINISTRACIÓN',
    type: AccountType.GASTO,
    parentCode: '6',
  },
  {
    code: '6.1.01',
    name: 'SUELDOS Y SALARIOS',
    type: AccountType.GASTO,
    parentCode: '6.1',
  },
  {
    code: '6.1.02',
    name: 'GASTOS DE ALQUILER',
    type: AccountType.GASTO,
    parentCode: '6.1',
  },
  {
    code: '6.1.03',
    name: 'SERVICIOS PÚBLICOS',
    type: AccountType.GASTO,
    parentCode: '6.1',
  },
  {
    code: '6.1.04',
    name: 'GASTOS DE DEPRECIACIÓN',
    type: AccountType.GASTO,
    parentCode: '6.1',
  },
  {
    code: '6.1.05',
    name: 'GASTOS DE MANTENIMIENTO',
    type: AccountType.GASTO,
    parentCode: '6.1',
  },
  {
    code: '6.1.06',
    name: 'GASTOS LEGALES Y DE CONSTITUCIÓN',
    type: AccountType.GASTO,
    parentCode: '6.1',
  },
  {
    code: '6.2',
    name: 'GASTOS DE VENTAS',
    type: AccountType.GASTO,
    parentCode: '6',
  },
  {
    code: '6.2.01',
    name: 'PUBLICIDAD Y PROPAGANDA',
    type: AccountType.GASTO,
    parentCode: '6.2',
  },
  {
    code: '6.3',
    name: 'GASTOS FINANCIEROS',
    type: AccountType.GASTO,
    parentCode: '6',
  },
  {
    code: '6.3.01',
    name: 'INTERESES Y COMISIONES BANCARIAS',
    type: AccountType.GASTO,
    parentCode: '6.3',
  },
  {
    code: '6.3.02',
    name: 'OTROS GASTOS FINANCIEROS',
    type: AccountType.GASTO,
    parentCode: '6.3',
  },
  {
    code: '6.4',
    name: 'OTROS GASTOS',
    type: AccountType.GASTO,
    parentCode: '6',
  },
  {
    code: '6.4.01',
    name: 'GASTOS DIVERSOS',
    type: AccountType.GASTO,
    parentCode: '6.4',
  },
];

const DEFAULT_NATURE: Record<AccountType, AccountNature> = {
  [AccountType.ACTIVO]: AccountNature.DEBITO,
  [AccountType.PASIVO]: AccountNature.CREDITO,
  [AccountType.PATRIMONIO]: AccountNature.CREDITO,
  [AccountType.INGRESO]: AccountNature.CREDITO,
  [AccountType.COSTO]: AccountNature.DEBITO,
  [AccountType.GASTO]: AccountNature.DEBITO,
};

async function seedChartOfAccounts() {
  for (const seed of CHART_OF_ACCOUNTS) {
    const parent = seed.parentCode
      ? await prisma.account.findUnique({ where: { code: seed.parentCode } })
      : null;

    const data = {
      code: seed.code,
      name: seed.name,
      type: seed.type,
      nature: seed.nature ?? DEFAULT_NATURE[seed.type],
      parentId: parent?.id ?? null,
    };

    await prisma.account.upsert({
      where: { code: seed.code },
      update: data,
      create: data,
    });
  }

  const salesAccount = await prisma.account.findUniqueOrThrow({
    where: { code: '4.1.01' },
  });
  const itbmsAccount = await prisma.account.findUniqueOrThrow({
    where: { code: '2.1.02' },
  });
  const receivableAccount = await prisma.account.findUniqueOrThrow({
    where: { code: '1.1.03' },
  });

  await prisma.accountingConfig.upsert({
    where: { id: 1 },
    update: {
      salesAccountId: salesAccount.id,
      itbmsAccountId: itbmsAccount.id,
      receivableAccountId: receivableAccount.id,
    },
    create: {
      id: 1,
      salesAccountId: salesAccount.id,
      itbmsAccountId: itbmsAccount.id,
      receivableAccountId: receivableAccount.id,
    },
  });

  console.log(`Chart of accounts ready (${CHART_OF_ACCOUNTS.length} accounts)`);
}

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@erp.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'ERP',
      role: Role.ADMIN,
    },
  });

  console.log(`Admin user ready: ${admin.email}`);

  await seedChartOfAccounts();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());