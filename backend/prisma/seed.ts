// Seed: popula o banco com dados de exemplo para você testar antes de importar
// os dados reais. Roda com `npm run seed` (ou junto no `npm run setup`).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_TERMO_TEMPLATE } from "../src/modules/documents/default-template";

const prisma = new PrismaClient();

// Datas relativas a hoje, para os alertas aparecerem já no primeiro teste.
const hoje = new Date();
function diasAtras(n: number) {
  const d = new Date(hoje);
  d.setDate(d.getDate() - n);
  return d;
}
function diasFrente(n: number) {
  const d = new Date(hoje);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("🌱 Populando dados de exemplo...");

  // --- Unidades (tenants) ---
  const nomesUnidades = ["São Paulo", "Belo Horizonte", "Maceió", "Aracaju", "Belém"];
  const unidades: Record<string, string> = {};
  for (const nome of nomesUnidades) {
    const u = await prisma.unit.upsert({ where: { name: nome }, update: {}, create: { name: nome } });
    unidades[nome] = u.id;
    // Configurações (limites de alerta) por unidade.
    await prisma.settings.upsert({ where: { unitId: u.id }, update: {}, create: { unitId: u.id } });
  }
  const bhId = unidades["Belo Horizonte"]; // unidade padrão dos exemplos

  // --- Usuários do sistema (admin pode entrar em qualquer unidade) ---
  await prisma.user.upsert({
    where: { email: "admin@empresa.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@empresa.com",
      role: "ADMIN",
      unitId: bhId,
      passwordHash: await bcrypt.hash("admin123", 10),
    },
  });
  await prisma.user.upsert({
    where: { email: "ti@empresa.com" },
    update: {},
    create: {
      name: "Analista de TI",
      email: "ti@empresa.com",
      role: "COMMON",
      unitId: bhId,
      passwordHash: await bcrypt.hash("ti123456", 10),
    },
  });

  // --- Template do termo ---
  await prisma.documentTemplate.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, content: DEFAULT_TERMO_TEMPLATE },
  });

  // --- Categorias (na unidade padrão) ---
  const nomesCategorias = [
    "Notebook",
    "Mouse",
    "Teclado",
    "Combo mouse/teclado",
    "Fone de ouvido",
    "Monitor",
    "Celular",
    "Outros",
  ];
  const categorias: Record<string, string> = {};
  for (const nome of nomesCategorias) {
    const existente = await prisma.category.findFirst({ where: { name: nome, unitId: bhId } });
    const c = existente ?? (await prisma.category.create({ data: { name: nome, unitId: bhId } }));
    categorias[nome] = c.id;
  }

  // Evita duplicar equipamentos se o seed rodar de novo.
  const jaTem = await prisma.equipment.count();
  if (jaTem > 0) {
    console.log("ℹ️  Já existem equipamentos — pulando a criação de exemplos.");
    console.log("✅ Seed concluído.");
    return;
  }

  // --- Equipamentos de exemplo ---
  // Notebook em uso, com troca de responsável no histórico.
  const notebook = await prisma.equipment.create({
    data: {
      assetId: "NB-0001",
      categoryId: categorias["Notebook"],
      unitId: bhId,
      brand: "Dell",
      model: "Latitude 5440",
      color: "Preto",
      configuration: "i7 / 16GB / 512GB SSD",
      serialNumber: "DL5440X12345",
      assetTag: "PAT-1001",
      status: "EM_USO",
      condition: "BOM",
      ownership: "PROPRIO",
      supplier: "Dell Brasil",
      location: "Matriz - 3º andar",
      currentUserName: "Mariana Souza",
      department: "Financeiro",
      manager: "Carlos Lima",
      userEmail: "mariana.souza@empresa.com",
      acquisitionDate: diasAtras(400),
      deliveryDate: diasAtras(120),
      warrantyEndDate: diasFrente(20), // garantia vencendo -> alerta
      lastCheckDate: diasAtras(40),
      value: 6500,
      notes: "Pequeno risco na tampa. Bateria segura ~4h.",
      accessories: "Carregador 65W, Mochila, Mouse sem fio",
      statusChangedAt: diasAtras(120),
    },
  });
  // Histórico: responsável antigo (fechado) + atual (aberto).
  await prisma.assignmentHistory.create({
    data: {
      equipmentId: notebook.id,
      userName: "João Pereira",
      department: "Financeiro",
      startDate: diasAtras(380),
      endDate: diasAtras(120),
      note: "Responsável anterior.",
    },
  });
  await prisma.assignmentHistory.create({
    data: {
      equipmentId: notebook.id,
      userName: "Mariana Souza",
      userEmail: "mariana.souza@empresa.com",
      department: "Financeiro",
      manager: "Carlos Lima",
      startDate: diasAtras(120),
      note: "Responsável atual.",
    },
  });

  // Monitor em estoque parado há muito tempo -> alerta de "parado".
  await prisma.equipment.create({
    data: {
      assetId: "MON-0007",
      categoryId: categorias["Monitor"],
      unitId: bhId,
      brand: "LG",
      model: "24MK430",
      color: "Preto",
      serialNumber: "LG24MK0007",
      assetTag: "PAT-2007",
      status: "EM_ESTOQUE",
      condition: "BOM",
      ownership: "ALUGADO",
      location: "Almoxarifado TI",
      value: 750,
      acquisitionDate: diasAtras(300),
      warrantyEndDate: diasAtras(10), // garantia vencida -> alerta
      lastCheckDate: diasAtras(220), // conferência atrasada -> alerta
      accessories: "Cabo HDMI, Cabo de força",
      statusChangedAt: diasAtras(150), // parado há 150 dias
    },
  });

  // Combo mouse/teclado em uso (item único).
  await prisma.equipment.create({
    data: {
      assetId: "CMB-0003",
      categoryId: categorias["Combo mouse/teclado"],
      unitId: bhId,
      brand: "Logitech",
      model: "MK270",
      color: "Preto",
      serialNumber: "LOGMK270-003",
      status: "EM_USO",
      condition: "NOVO",
      ownership: "PROPRIO",
      location: "Matriz - 2º andar",
      currentUserName: "Pedro Alves",
      department: "Comercial",
      manager: "Ana Dias",
      userEmail: "pedro.alves@empresa.com",
      deliveryDate: diasAtras(15),
      value: 180,
      accessories: "Receptor USB unificador",
      statusChangedAt: diasAtras(15),
    },
  });
  // abre histórico para o combo
  await prisma.assignmentHistory.create({
    data: {
      equipmentId: (await prisma.equipment.findFirstOrThrow({ where: { assetId: "CMB-0003" } })).id,
      userName: "Pedro Alves",
      userEmail: "pedro.alves@empresa.com",
      department: "Comercial",
      startDate: diasAtras(15),
    },
  });

  // Celular em manutenção, com defeito.
  await prisma.equipment.create({
    data: {
      assetId: "CEL-0012",
      categoryId: categorias["Celular"],
      unitId: bhId,
      brand: "Samsung",
      model: "Galaxy A54",
      color: "Grafite",
      serialNumber: "SMA54-0012",
      assetTag: "PAT-3012",
      status: "EM_MANUTENCAO",
      condition: "DEFEITO",
      ownership: "PROPRIO",
      supplier: "Samsung",
      location: "Assistência técnica",
      value: 2200,
      pelicula: "Sim",
      capa: "Sim",
      imei1: "356938035643809",
      imei2: "356938035643817",
      macAddress: "A1:B2:C3:D4:E5:F6",
      userCpf: "123.456.789-09",
      acquisitionDate: diasAtras(500),
      notes: "Tela com mancha no canto inferior. Em garantia? Verificar nota.",
      accessories: "Carregador, Capa",
      statusChangedAt: diasAtras(5),
    },
  });

  // Fone em estoque, novo.
  await prisma.equipment.create({
    data: {
      assetId: "FON-0021",
      categoryId: categorias["Fone de ouvido"],
      unitId: bhId,
      brand: "JBL",
      model: "Tune 510",
      color: "Azul",
      status: "EM_ESTOQUE",
      condition: "NOVO",
      ownership: "ALUGADO",
      location: "Almoxarifado TI",
      value: 250,
      acquisitionDate: diasAtras(20),
      lastCheckDate: diasAtras(20),
      statusChangedAt: diasAtras(20),
    },
  });

  console.log("✅ Seed concluído.");
  console.log("\n   Login admin:  admin@empresa.com / admin123");
  console.log("   Login comum:  ti@empresa.com / ti123456\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
