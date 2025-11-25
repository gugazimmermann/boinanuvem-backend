import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMMON_FEATURES = [
  'Gestão de Animais',
  'Controle de Localização',
  'Registro de Nascimentos',
  'Controle de Mortes',
  'Gestão de Pesagens',
  'Controle Sanitário',
  'Gestão de Reprodução',
  'Controle de Vendas',
  'Gestão de Aquisições',
  'Controle de Movimentações',
  'Gestão de Funcionários',
  'Controle de Fornecedores',
  'Gestão de Compradores',
  'Controle de Prestadores',
  'Gestão de Contas a Pagar',
  'Controle de Contas a Receber',
  'Gestão de Fluxo de Caixa',
  'Controle de Estoque',
  'Gestão de Movimentações de Estoque',
  'Controle de Contas Bancárias',
  'Gestão de Propriedades',
  'Controle de Empresas',
  'Gestão de Usuários',
  'Logs de Atividade',
  'Relatórios Detalhados',
  'Suporte por Email',
] as const;

const PRICING_PLANS = [
  {
    name: 'Mínimo',
    description: 'Plano ideal para começar sua gestão.',
    monthlyPrice: 'R$ 49,90',
    annualPrice: 'R$ 479,00',
    limits: {
      properties: '1 Propriedade',
      locations: '10 Localizações',
      animals: '50 Animais',
      members: '2 Membros',
    },
    features: COMMON_FEATURES,
    popular: false,
    status: 'active',
  },
  {
    name: 'Básico',
    description: 'Plano ideal para pequenas propriedades.',
    monthlyPrice: 'R$ 99,00',
    annualPrice: 'R$ 950,00',
    limits: {
      properties: '1 Propriedade',
      locations: '20 Localizações',
      animals: '100 Animais',
      members: '5 Membros',
    },
    features: COMMON_FEATURES,
    popular: false,
    status: 'active',
  },
  {
    name: 'Padrão',
    description: 'Plano completo para propriedades em crescimento.',
    monthlyPrice: 'R$ 149,90',
    annualPrice: 'R$ 1.439,00',
    limits: {
      properties: '1 Propriedade',
      locations: 'Ilimitadas',
      animals: '500 Animais',
      members: 'Ilimitados',
    },
    features: COMMON_FEATURES,
    popular: true,
    status: 'active',
  },
  {
    name: 'Avançado',
    description: 'Plano completo para grandes fazendas e equipes.',
    monthlyPrice: 'R$ 249,90',
    annualPrice: 'R$ 2.399,00',
    limits: {
      properties: 'Ilimitadas',
      locations: 'Ilimitadas',
      animals: 'Ilimitados',
      members: 'Ilimitados',
    },
    features: COMMON_FEATURES,
    popular: false,
    status: 'active',
  },
] as const;

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing plans
  await prisma.plan.deleteMany();

  // Create plans
  for (const plan of PRICING_PLANS) {
    await prisma.plan.create({
      data: {
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        limits: plan.limits,
        features: [...plan.features],
        popular: plan.popular,
        status: plan.status,
      },
    });
    console.log(`✅ Created plan: ${plan.name}`);
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
