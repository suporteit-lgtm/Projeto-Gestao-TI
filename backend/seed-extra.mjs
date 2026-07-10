// Script para adicionar equipamentos de teste via Prisma
// Roda com: node seed-extra.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const hoje = new Date();
function diasAtras(n) {
  const d = new Date(hoje);
  d.setDate(d.getDate() - n);
  return d;
}
function diasFrente(n) {
  const d = new Date(hoje);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("🌱 Criando itens de teste extras...\n");

  // Pega a primeira unidade disponível
  const unidade = await prisma.unit.findFirst();
  if (!unidade) {
    console.error("❌ Nenhuma unidade encontrada. Rode npm run seed primeiro.");
    return;
  }
  console.log(`📍 Unidade: ${unidade.name} (${unidade.id})`);

  // Busca ou cria categorias
  async function getOrCreateCategory(name) {
    const existente = await prisma.category.findFirst({ where: { name, unitId: unidade.id } });
    if (existente) return existente.id;
    const nova = await prisma.category.create({ data: { name, unitId: unidade.id } });
    return nova.id;
  }

  const cats = {
    notebook:   await getOrCreateCategory("Notebook"),
    monitor:    await getOrCreateCategory("Monitor"),
    celular:    await getOrCreateCategory("Celular"),
    mouse:      await getOrCreateCategory("Mouse"),
    teclado:    await getOrCreateCategory("Teclado"),
    fone:       await getOrCreateCategory("Fone de ouvido"),
    combo:      await getOrCreateCategory("Combo mouse/teclado"),
    impressora: await getOrCreateCategory("Impressora"),
    tablet:     await getOrCreateCategory("Tablet"),
    outros:     await getOrCreateCategory("Outros"),
  };

  const equipamentos = [
    // ─── Notebooks ───
    {
      assetId: "NB-0010",
      categoryId: cats.notebook,
      brand: "Dell",
      model: "Latitude 5540",
      color: "Preto",
      configuration: "i5 / 16GB / 256GB SSD",
      serialNumber: "DL5540A00010",
      assetTag: "PAT-1010",
      status: "EM_USO",
      condition: "BOM",
      ownership: "PROPRIO",
      supplier: "Dell Brasil",
      location: "Filial SP - 2º andar",
      currentUserName: "Ana Rodrigues",
      department: "RH",
      manager: "Fernanda Costa",
      userEmail: "ana.rodrigues@empresa.com",
      acquisitionDate: diasAtras(365),
      deliveryDate: diasAtras(90),
      warrantyEndDate: diasFrente(180),
      lastCheckDate: diasAtras(10),
      value: 5800,
      accessories: "Carregador 65W, Mouse sem fio",
    },
    {
      assetId: "NB-0011",
      categoryId: cats.notebook,
      brand: "Lenovo",
      model: "ThinkPad E14 Gen 5",
      color: "Preto",
      configuration: "i7 / 32GB / 512GB SSD",
      serialNumber: "LNV-E14-00011",
      assetTag: "PAT-1011",
      status: "EM_USO",
      condition: "NOVO",
      ownership: "PROPRIO",
      supplier: "Lenovo Brasil",
      location: "Sede SP - TI",
      currentUserName: "Bruno Martins",
      department: "TI",
      manager: "Claudio Pires",
      userEmail: "bruno.martins@empresa.com",
      acquisitionDate: diasAtras(30),
      deliveryDate: diasAtras(20),
      warrantyEndDate: diasFrente(335),
      lastCheckDate: diasAtras(20),
      value: 8900,
      accessories: "Carregador 65W, Mochila Lenovo, Dock USB-C",
    },
    {
      assetId: "NB-0012",
      categoryId: cats.notebook,
      brand: "HP",
      model: "EliteBook 840 G10",
      color: "Prata",
      configuration: "i5 / 8GB / 256GB SSD",
      serialNumber: "HP840G10-00012",
      assetTag: "PAT-1012",
      status: "EM_ESTOQUE",
      condition: "BOM",
      ownership: "PROPRIO",
      location: "Almoxarifado TI",
      acquisitionDate: diasAtras(200),
      warrantyEndDate: diasFrente(160),
      lastCheckDate: diasAtras(60),
      value: 5200,
      statusChangedAt: diasAtras(90),
    },
    {
      assetId: "NB-0013",
      categoryId: cats.notebook,
      brand: "Apple",
      model: "MacBook Pro 14\" M3",
      color: "Space Black",
      configuration: "M3 Pro / 18GB / 512GB",
      serialNumber: "APL-MBP14-00013",
      assetTag: "PAT-1013",
      status: "EM_USO",
      condition: "NOVO",
      ownership: "PROPRIO",
      supplier: "Apple Store",
      location: "Sede SP - Diretoria",
      currentUserName: "Carla Mendes",
      department: "Diretoria",
      manager: "Roberto Alves",
      userEmail: "carla.mendes@empresa.com",
      acquisitionDate: diasAtras(45),
      deliveryDate: diasAtras(40),
      warrantyEndDate: diasFrente(320),
      lastCheckDate: diasAtras(40),
      value: 22000,
      accessories: "Carregador MagSafe, USB-C Hub, Mouse Magic",
    },
    {
      assetId: "NB-0014",
      categoryId: cats.notebook,
      brand: "Dell",
      model: "Inspiron 15 3530",
      color: "Preto",
      configuration: "i3 / 8GB / 256GB SSD",
      serialNumber: "DL3530-00014",
      status: "EM_MANUTENCAO",
      condition: "DEFEITO",
      ownership: "PROPRIO",
      location: "Assistência técnica - Dell",
      acquisitionDate: diasAtras(730),
      warrantyEndDate: diasAtras(5),
      value: 3200,
      notes: "Placa mãe com defeito. Em análise pela assistência.",
      statusChangedAt: diasAtras(7),
    },

    // ─── Monitores ───
    {
      assetId: "MON-0010",
      categoryId: cats.monitor,
      brand: "LG",
      model: "27UK850-W 4K",
      color: "Branco/Prata",
      serialNumber: "LG27UK-00010",
      assetTag: "PAT-2010",
      status: "EM_USO",
      condition: "BOM",
      ownership: "PROPRIO",
      location: "Sede SP - TI",
      currentUserName: "Bruno Martins",
      department: "TI",
      acquisitionDate: diasAtras(500),
      warrantyEndDate: diasFrente(50),
      lastCheckDate: diasAtras(15),
      value: 2800,
      accessories: "Cabo HDMI, Cabo DisplayPort",
    },
    {
      assetId: "MON-0011",
      categoryId: cats.monitor,
      brand: "Samsung",
      model: "S27BG400EU 27\"",
      color: "Preto",
      serialNumber: "SAM-S27BG-00011",
      status: "EM_ESTOQUE",
      condition: "NOVO",
      ownership: "PROPRIO",
      location: "Almoxarifado TI",
      acquisitionDate: diasAtras(10),
      warrantyEndDate: diasFrente(355),
      lastCheckDate: diasAtras(10),
      value: 1600,
      accessories: "Cabo HDMI, Cabo de força",
      statusChangedAt: diasAtras(10),
    },
    {
      assetId: "MON-0012",
      categoryId: cats.monitor,
      brand: "Dell",
      model: "U2722D 27\" QHD",
      color: "Preto/Prata",
      serialNumber: "DLU2722-00012",
      assetTag: "PAT-2012",
      status: "EM_USO",
      condition: "BOM",
      ownership: "PROPRIO",
      location: "Sede SP - Financeiro",
      currentUserName: "Ana Rodrigues",
      department: "Financeiro",
      acquisitionDate: diasAtras(400),
      warrantyEndDate: diasFrente(60),
      lastCheckDate: diasAtras(20),
      value: 3200,
      accessories: "Cabo DisplayPort",
    },

    // ─── Celulares ───
    {
      assetId: "CEL-0020",
      categoryId: cats.celular,
      brand: "Apple",
      model: "iPhone 15 Pro 128GB",
      color: "Titânio Natural",
      serialNumber: "APL-IP15P-00020",
      assetTag: "PAT-3020",
      status: "EM_USO",
      condition: "NOVO",
      ownership: "PROPRIO",
      supplier: "Apple Store",
      location: "Sede SP",
      currentUserName: "Carla Mendes",
      department: "Diretoria",
      userEmail: "carla.mendes@empresa.com",
      acquisitionDate: diasAtras(60),
      deliveryDate: diasAtras(55),
      warrantyEndDate: diasFrente(305),
      lastCheckDate: diasAtras(55),
      value: 9000,
      pelicula: "Sim",
      capa: "Sim",
      imei1: "352099001761481",
      imei2: "352099001761499",
      accessories: "Cabo USB-C, Fonte 20W",
    },
    {
      assetId: "CEL-0021",
      categoryId: cats.celular,
      brand: "Samsung",
      model: "Galaxy S24 Ultra 256GB",
      color: "Preto Titânio",
      serialNumber: "SAM-S24U-00021",
      status: "EM_USO",
      condition: "BOM",
      ownership: "PROPRIO",
      location: "Filial BH",
      currentUserName: "Diego Souza",
      department: "Comercial",
      acquisitionDate: diasAtras(180),
      warrantyEndDate: diasFrente(185),
      lastCheckDate: diasAtras(30),
      value: 7500,
      pelicula: "Sim",
      imei1: "359843106837051",
      accessories: "Carregador 45W, S-Pen",
    },
    {
      assetId: "CEL-0022",
      categoryId: cats.celular,
      brand: "Motorola",
      model: "Edge 40 Neo",
      color: "Preto",
      serialNumber: "MOT-E40N-00022",
      status: "EM_ESTOQUE",
      condition: "NOVO",
      ownership: "PROPRIO",
      location: "Almoxarifado TI",
      acquisitionDate: diasAtras(5),
      warrantyEndDate: diasFrente(360),
      lastCheckDate: diasAtras(5),
      value: 1800,
      accessories: "Carregador 68W, Capa protetora",
      statusChangedAt: diasAtras(5),
    },

    // ─── Periféricos ───
    {
      assetId: "MSE-0050",
      categoryId: cats.mouse,
      brand: "Logitech",
      model: "MX Master 3S",
      color: "Grafite",
      serialNumber: "LOG-MXM3S-00050",
      status: "EM_USO",
      condition: "BOM",
      ownership: "PROPRIO",
      location: "Sede SP - TI",
      currentUserName: "Bruno Martins",
      department: "TI",
      acquisitionDate: diasAtras(200),
      warrantyEndDate: diasFrente(165),
      lastCheckDate: diasAtras(15),
      value: 650,
      accessories: "Receptor USB Nano, Cabo USB-C",
    },
    {
      assetId: "TEC-0050",
      categoryId: cats.teclado,
      brand: "Keychron",
      model: "K2 Pro",
      color: "Preto",
      serialNumber: "KCH-K2P-00050",
      status: "EM_USO",
      condition: "NOVO",
      ownership: "PROPRIO",
      location: "Sede SP - TI",
      currentUserName: "Bruno Martins",
      department: "TI",
      acquisitionDate: diasAtras(60),
      warrantyEndDate: diasFrente(305),
      lastCheckDate: diasAtras(60),
      value: 850,
    },
    {
      assetId: "FON-0030",
      categoryId: cats.fone,
      brand: "Sony",
      model: "WH-1000XM5",
      color: "Preto",
      serialNumber: "SONY-XM5-00030",
      status: "EM_USO",
      condition: "BOM",
      ownership: "PROPRIO",
      location: "Sede SP - Diretoria",
      currentUserName: "Carla Mendes",
      department: "Diretoria",
      acquisitionDate: diasAtras(300),
      warrantyEndDate: diasFrente(65),
      lastCheckDate: diasAtras(25),
      value: 1900,
      accessories: "Cabo USB-C, Cabo P2, Case",
    },

    // ─── Tablets ───
    {
      assetId: "TAB-0010",
      categoryId: cats.tablet,
      brand: "Apple",
      model: "iPad Pro 12.9\" M2",
      color: "Cinza Espacial",
      serialNumber: "APL-IPADP12-00010",
      assetTag: "PAT-5010",
      status: "EM_USO",
      condition: "BOM",
      ownership: "PROPRIO",
      location: "Sede SP - Comercial",
      currentUserName: "Diego Souza",
      department: "Comercial",
      acquisitionDate: diasAtras(250),
      warrantyEndDate: diasFrente(115),
      lastCheckDate: diasAtras(20),
      value: 8500,
      accessories: "Apple Pencil 2ª geração, Magic Keyboard, Cape Smart",
    },

    // ─── Impressoras ───
    {
      assetId: "IMP-0010",
      categoryId: cats.impressora,
      brand: "HP",
      model: "LaserJet Pro 4004dn",
      color: "Cinza",
      serialNumber: "HPLJ4004-00010",
      assetTag: "PAT-6010",
      status: "EM_USO",
      condition: "BOM",
      ownership: "ALUGADO",
      location: "Sede SP - Recepção",
      department: "Administrativo",
      acquisitionDate: diasAtras(600),
      warrantyEndDate: diasAtras(240),
      lastCheckDate: diasAtras(90),
      value: 3500,
      notes: "Contrato de locação vencido. Renovar.",
      statusChangedAt: diasAtras(600),
    },

    // ─── Alertas propositais ───
    {
      assetId: "NB-ALERT-01",
      categoryId: cats.notebook,
      brand: "Asus",
      model: "VivoBook 15",
      color: "Cinza",
      serialNumber: "ASUS-VB15-ALERT01",
      status: "EM_ESTOQUE",
      condition: "BOM",
      ownership: "PROPRIO",
      location: "Almoxarifado",
      acquisitionDate: diasAtras(400),
      warrantyEndDate: diasAtras(30), // GARANTIA VENCIDA → alerta
      lastCheckDate: diasAtras(200),  // CONFERÊNCIA ATRASADA → alerta
      value: 2800,
      notes: "Equipamento com alertas de teste: garantia vencida e conferência atrasada.",
      statusChangedAt: diasAtras(160), // PARADO HÁ 160 DIAS → alerta
    },
    {
      assetId: "CEL-ALERT-02",
      categoryId: cats.celular,
      brand: "Xiaomi",
      model: "Redmi Note 12",
      color: "Azul",
      serialNumber: "XMI-RN12-ALERT02",
      status: "EM_ESTOQUE",
      condition: "BOM",
      ownership: "PROPRIO",
      location: "Almoxarifado",
      acquisitionDate: diasAtras(300),
      warrantyEndDate: diasFrente(10), // GARANTIA A VENCER EM 10 DIAS → alerta
      lastCheckDate: diasAtras(180),    // CONFERÊNCIA ATRASADA → alerta
      value: 1200,
      notes: "Equipamento com alertas de teste: garantia vencendo em breve e conferência atrasada.",
      statusChangedAt: diasAtras(120), // PARADO HÁ 120 DIAS → alerta
    },
  ];

  let criados = 0;
  let pulados = 0;

  for (const eq of equipamentos) {
    const existente = await prisma.equipment.findFirst({ where: { assetId: eq.assetId } });
    if (existente) {
      console.log(`  ⏭️  Já existe: ${eq.assetId}`);
      pulados++;
      continue;
    }

    await prisma.equipment.create({
      data: {
        ...eq,
        unitId: unidade.id,
        statusChangedAt: eq.statusChangedAt ?? hoje,
      },
    });
    console.log(`  ✅ Criado: ${eq.assetId} — ${eq.brand} ${eq.model}`);
    criados++;
  }

  console.log(`\n✨ Concluído! ${criados} criado(s), ${pulados} já existente(s).`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
