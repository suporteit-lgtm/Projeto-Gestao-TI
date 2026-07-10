// Script: adiciona mais itens fictícios variados ao inventário.
// Roda com: node seed-ficticios.mjs
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

const RESPONSAVEIS = [
  { nome: "Lucas Ferreira",    dept: "TI",           gestor: "Claudio Pires",    email: "lucas.ferreira@locgrupo.com.br" },
  { nome: "Juliana Campos",    dept: "Financeiro",   gestor: "Marcos Andrade",   email: "juliana.campos@locgrupo.com.br" },
  { nome: "Rafael Nascimento", dept: "Comercial",    gestor: "Ana Dias",         email: "rafael.nascimento@locgrupo.com.br" },
  { nome: "Patricia Lima",     dept: "RH",           gestor: "Fernanda Costa",   email: "patricia.lima@locgrupo.com.br" },
  { nome: "Eduardo Santos",    dept: "Jurídico",     gestor: "Cristiano Melo",   email: "eduardo.santos@locgrupo.com.br" },
  { nome: "Tatiane Rocha",     dept: "Marketing",    gestor: "Roberto Alves",    email: "tatiane.rocha@locgrupo.com.br" },
  { nome: "Gustavo Moreira",   dept: "Operações",    gestor: "Sonia Vieira",     email: "gustavo.moreira@locgrupo.com.br" },
  { nome: "Camila Dias",       dept: "Suporte",      gestor: "Claudio Pires",    email: "camila.dias@locgrupo.com.br" },
  { nome: "Fernando Alves",    dept: "Diretoria",    gestor: "CEO",              email: "fernando.alves@locgrupo.com.br" },
  { nome: "Bianca Oliveira",   dept: "Administrativo", gestor: "Sonia Vieira",  email: "bianca.oliveira@locgrupo.com.br" },
];

async function main() {
  console.log("🎭 Criando itens fictícios...\n");

  const unidade = await prisma.unit.findFirst();
  if (!unidade) {
    console.error("❌ Nenhuma unidade encontrada.");
    return;
  }
  console.log(`📍 Unidade: ${unidade.name}\n`);

  async function cat(name) {
    const existente = await prisma.category.findFirst({ where: { name, unitId: unidade.id } });
    if (existente) return existente.id;
    return (await prisma.category.create({ data: { name, unitId: unidade.id } })).id;
  }

  const C = {
    nb:     await cat("Notebook"),
    mon:    await cat("Monitor"),
    cel:    await cat("Celular"),
    mouse:  await cat("Mouse"),
    tec:    await cat("Teclado"),
    combo:  await cat("Combo mouse/teclado"),
    fone:   await cat("Fone de ouvido"),
    imp:    await cat("Impressora"),
    tab:    await cat("Tablet"),
    cam:    await cat("Câmera / Webcam"),
    hub:    await cat("Hub / Dock"),
    cabo:   await cat("Acessório / Cabo"),
    outros: await cat("Outros"),
  };

  const R = RESPONSAVEIS;

  const itens = [
    // ─────── NOTEBOOKS ───────
    { assetId:"NB-0020", categoryId:C.nb,  brand:"Dell",    model:"Latitude 5440",        color:"Preto",   config:"i7/16GB/512GB", sn:"DL5440-0020", tag:"PAT-1020", status:"EM_USO",        cond:"BOM",    own:"PROPRIO",  loc:"SP - 3º andar",       resp:R[0], acq:diasAtras(500), del:diasAtras(200), war:diasFrente(50),  chk:diasAtras(8),  val:6400,  acc:"Carregador 65W, Mochila" },
    { assetId:"NB-0021", categoryId:C.nb,  brand:"Lenovo",  model:"ThinkBook 16 G6",      color:"Cinza",   config:"i5/8GB/256GB",  sn:"LNV-TB16-0021",tag:"PAT-1021", status:"EM_USO",        cond:"BOM",    own:"PROPRIO",  loc:"SP - 2º andar",       resp:R[1], acq:diasAtras(360), del:diasAtras(100), war:diasFrente(265), chk:diasAtras(12), val:4900,  acc:"Carregador, Mouse" },
    { assetId:"NB-0022", categoryId:C.nb,  brand:"HP",      model:"ProBook 450 G10",       color:"Prata",   config:"i5/16GB/512GB", sn:"HPPB450-0022", tag:"PAT-1022", status:"EM_ESTOQUE",    cond:"BOM",    own:"PROPRIO",  loc:"Almoxarifado",        resp:null, acq:diasAtras(180), del:null,           war:diasFrente(185), chk:diasAtras(10), val:5100,  acc:"Carregador",               sta:diasAtras(70) },
    { assetId:"NB-0023", categoryId:C.nb,  brand:"Acer",    model:"Aspire 5 A515",         color:"Prata",   config:"i3/8GB/256GB",  sn:"ACR-A515-0023",             status:"EM_ESTOQUE",    cond:"NOVO",   own:"PROPRIO",  loc:"Almoxarifado",        resp:null, acq:diasAtras(20),  del:null,           war:diasFrente(345), chk:diasAtras(20), val:2700,  acc:"Carregador 45W",           sta:diasAtras(20) },
    { assetId:"NB-0024", categoryId:C.nb,  brand:"Samsung", model:"Galaxy Book4 Pro",      color:"Prata",   config:"i7/16GB/512GB", sn:"SAM-GB4P-0024",             status:"EM_USO",        cond:"NOVO",   own:"PROPRIO",  loc:"SP - Marketing",      resp:R[5], acq:diasAtras(90),  del:diasAtras(80),  war:diasFrente(275), chk:diasAtras(80), val:7200,  acc:"Carregador 65W" },
    { assetId:"NB-0025", categoryId:C.nb,  brand:"Dell",    model:"XPS 13 9340",           color:"Platina", config:"i7/16GB/512GB", sn:"DL-XPS13-0025",tag:"PAT-1025", status:"EM_USO",        cond:"NOVO",   own:"PROPRIO",  loc:"SP - Jurídico",       resp:R[4], acq:diasAtras(150), del:diasAtras(140), war:diasFrente(215), chk:diasAtras(30), val:9500,  acc:"Carregador USB-C, Hub" },
    { assetId:"NB-0026", categoryId:C.nb,  brand:"Lenovo",  model:"IdeaPad Slim 5",        color:"Preto",   config:"Ryzen 5/8GB/256GB",sn:"LNV-IS5-0026",             status:"EM_MANUTENCAO", cond:"DEFEITO",own:"PROPRIO",  loc:"Assistência técnica", resp:null, acq:diasAtras(700), del:null,           war:diasAtras(65),   chk:diasAtras(50), val:3200,  notes:"Teclado com teclas travando.",  sta:diasAtras(10) },
    { assetId:"NB-0027", categoryId:C.nb,  brand:"Apple",   model:"MacBook Air 13\" M2",   color:"Midnight",config:"M2/8GB/256GB",  sn:"APL-MBA13-0027",tag:"PAT-1027", status:"EM_USO",        cond:"BOM",    own:"PROPRIO",  loc:"SP - RH",             resp:R[3], acq:diasAtras(400), del:diasAtras(395), war:diasFrente(100), chk:diasAtras(15), val:10500, acc:"Carregador MagSafe, Adaptador HDMI" },
    { assetId:"NB-0028", categoryId:C.nb,  brand:"HP",      model:"Victus 15 Gaming",      color:"Preto Azul",config:"i5/16GB/512GB",sn:"HPVCT-0028",               status:"EM_USO",        cond:"BOM",    own:"PROPRIO",  loc:"SP - TI",             resp:R[7], acq:diasAtras(300), del:diasAtras(280), war:diasFrente(65),  chk:diasAtras(20), val:4500,  acc:"Carregador 150W" },

    // ─────── MONITORES ───────
    { assetId:"MON-0020", categoryId:C.mon, brand:"LG",      model:"32UN880-B 4K Ergo",    color:"Prata",   sn:"LG32UN-0020", tag:"PAT-2020", status:"EM_USO",     cond:"NOVO",  own:"PROPRIO", loc:"SP - Diretoria",   resp:R[8], acq:diasAtras(60),  war:diasFrente(300), chk:diasAtras(60), val:4200, acc:"Cabo USB-C, Cabo HDMI" },
    { assetId:"MON-0021", categoryId:C.mon, brand:"AOC",     model:"Q27G2S/BK 27\" QHD",   color:"Preto",   sn:"AOC-Q27G2-0021",             status:"EM_ESTOQUE",  cond:"NOVO",  own:"PROPRIO", loc:"Almoxarifado",     resp:null, acq:diasAtras(15),  war:diasFrente(350), chk:diasAtras(15), val:1400, sta:diasAtras(15) },
    { assetId:"MON-0022", categoryId:C.mon, brand:"Samsung", model:"Smart Monitor M8 32\"",color:"Rosa",    sn:"SAM-M8R-0022",               status:"EM_USO",     cond:"BOM",   own:"PROPRIO", loc:"SP - Marketing",   resp:R[5], acq:diasAtras(250), war:diasFrente(115), chk:diasAtras(18), val:3500, acc:"Cabo USB-C" },
    { assetId:"MON-0023", categoryId:C.mon, brand:"Dell",    model:"P2422H 24\"",           color:"Preto",   sn:"DLP2422-0023",tag:"PAT-2023", status:"EM_USO",     cond:"BOM",   own:"PROPRIO", loc:"SP - Financeiro",  resp:R[1], acq:diasAtras(600), war:diasAtras(50),   chk:diasAtras(35), val:1800, acc:"Cabo HDMI" },
    { assetId:"MON-0024", categoryId:C.mon, brand:"BenQ",    model:"GW2790QT 27\" QHD",    color:"Preto",   sn:"BNQ-GW27-0024",              status:"EM_USO",     cond:"BOM",   own:"ALUGADO", loc:"SP - Suporte",     resp:R[7], acq:diasAtras(400), war:diasFrente(80),  chk:diasAtras(22), val:2200, acc:"Cabo DisplayPort" },

    // ─────── CELULARES ───────
    { assetId:"CEL-0030", categoryId:C.cel, brand:"Apple",   model:"iPhone 14 128GB",      color:"Azul",    sn:"APL-IP14-0030", tag:"PAT-3030", status:"EM_USO",   cond:"BOM",   own:"PROPRIO", loc:"SP - Financeiro",  resp:R[1], acq:diasAtras(400), del:diasAtras(390), war:diasFrente(100), chk:diasAtras(25), val:6500, acc:"Cabo USB-C, Case", imel1:"352099001762001" },
    { assetId:"CEL-0031", categoryId:C.cel, brand:"Samsung", model:"Galaxy A55 5G 128GB",  color:"Dourado", sn:"SAM-A55-0031",               status:"EM_USO",   cond:"NOVO",  own:"PROPRIO", loc:"SP - Comercial",   resp:R[2], acq:diasAtras(30),  del:diasAtras(25),  war:diasFrente(335), chk:diasAtras(25), val:2200, acc:"Carregador 25W", imei1:"359843106837200" },
    { assetId:"CEL-0032", categoryId:C.cel, brand:"Motorola",model:"Moto G84 5G",           color:"Marsala", sn:"MOT-G84-0032",               status:"EM_ESTOQUE",cond:"NOVO",  own:"PROPRIO", loc:"Almoxarifado",    resp:null, acq:diasAtras(7),   del:null,           war:diasFrente(358), chk:diasAtras(7),  val:1350, sta:diasAtras(7) },
    { assetId:"CEL-0033", categoryId:C.cel, brand:"Apple",   model:"iPhone SE 3ª geração", color:"Preto",   sn:"APL-IPSE3-0033",tag:"PAT-3033",status:"EM_MANUTENCAO",cond:"DEFEITO",own:"PROPRIO",loc:"Assistência técnica",resp:null,acq:diasAtras(550),del:null,war:diasAtras(185),chk:diasAtras(60),val:3200,notes:"Display trincado.",sta:diasAtras(14) },
    { assetId:"CEL-0034", categoryId:C.cel, brand:"Samsung", model:"Galaxy S23 FE 128GB",  color:"Grafite", sn:"SAM-S23FE-0034",             status:"EM_USO",   cond:"BOM",   own:"PROPRIO", loc:"SP - TI",          resp:R[7], acq:diasAtras(200), del:diasAtras(190), war:diasFrente(165), chk:diasAtras(15), val:3400, acc:"Carregador 25W" },

    // ─────── PERIFÉRICOS ───────
    { assetId:"CMB-0010", categoryId:C.combo, brand:"Logitech",model:"MK545 Wireless",     color:"Preto",   sn:"LOG-MK545-0010",             status:"EM_USO",   cond:"BOM",   own:"PROPRIO", loc:"SP - RH",          resp:R[3], acq:diasAtras(500), war:diasFrente(100), chk:diasAtras(30), val:380 },
    { assetId:"CMB-0011", categoryId:C.combo, brand:"Microsoft",model:"Wireless Desktop 900",color:"Preto", sn:"MSF-WD900-0011",             status:"EM_ESTOQUE",cond:"BOM",  own:"PROPRIO", loc:"Almoxarifado",    resp:null, acq:diasAtras(300), war:diasAtras(5),    chk:diasAtras(80), val:290, sta:diasAtras(90) },
    { assetId:"MSE-0060", categoryId:C.mouse, brand:"Logitech",model:"G305 Lightspeed",    color:"Preto",   sn:"LOG-G305-0060",              status:"EM_USO",   cond:"BOM",   own:"PROPRIO", loc:"SP - TI",          resp:R[0], acq:diasAtras(200), war:diasFrente(165), chk:diasAtras(10), val:220 },
    { assetId:"MSE-0061", categoryId:C.mouse, brand:"Razer",   model:"DeathAdder V3",      color:"Preto",   sn:"RZR-DAV3-0061",              status:"EM_USO",   cond:"NOVO",  own:"PROPRIO", loc:"SP - TI",          resp:R[7], acq:diasAtras(45),  war:diasFrente(320), chk:diasAtras(45), val:380 },
    { assetId:"FON-0040", categoryId:C.fone,  brand:"JBL",     model:"Tune 770NC",         color:"Azul",    sn:"JBL-T770-0040",              status:"EM_USO",   cond:"BOM",   own:"PROPRIO", loc:"SP - Marketing",   resp:R[5], acq:diasAtras(180), war:diasFrente(185), chk:diasAtras(20), val:480 },
    { assetId:"FON-0041", categoryId:C.fone,  brand:"Jabra",   model:"Evolve2 65",         color:"Preto",   sn:"JAB-EV265-0041",             status:"EM_USO",   cond:"NOVO",  own:"PROPRIO", loc:"SP - Comercial",   resp:R[2], acq:diasAtras(90),  war:diasFrente(275), chk:diasAtras(30), val:1200, acc:"Estação de carga USB" },
    { assetId:"FON-0042", categoryId:C.fone,  brand:"Sony",    model:"WH-CH720N",          color:"Branco",  sn:"SNY-WCH720-0042",            status:"EM_ESTOQUE",cond:"NOVO", own:"PROPRIO", loc:"Almoxarifado",    resp:null, acq:diasAtras(5),   war:diasFrente(360), chk:diasAtras(5),  val:620, sta:diasAtras(5) },

    // ─────── TABLETS ───────
    { assetId:"TAB-0020", categoryId:C.tab, brand:"Samsung",  model:"Galaxy Tab S9 FE",    color:"Grafite", sn:"SAM-TS9FE-0020",             status:"EM_USO",   cond:"BOM",   own:"PROPRIO", loc:"SP - Comercial",   resp:R[2], acq:diasAtras(120), del:diasAtras(115), war:diasFrente(245), chk:diasAtras(20), val:2800, acc:"Capa teclado, S-Pen" },
    { assetId:"TAB-0021", categoryId:C.tab, brand:"Lenovo",   model:"Tab M10 Plus Gen 3",  color:"Cinza",   sn:"LNV-TM10-0021",              status:"EM_ESTOQUE",cond:"NOVO", own:"ALUGADO", loc:"Almoxarifado",    resp:null, acq:diasAtras(10),  del:null,           war:diasFrente(355), chk:diasAtras(10), val:1400, sta:diasAtras(10) },

    // ─────── CÂMERAS ───────
    { assetId:"CAM-0010", categoryId:C.cam, brand:"Logitech", model:"StreamCam",           color:"Preto",   sn:"LOG-STCAM-0010",             status:"EM_USO",   cond:"BOM",   own:"PROPRIO", loc:"SP - Diretoria",   resp:R[8], acq:diasAtras(300), war:diasFrente(65),  chk:diasAtras(25), val:900 },
    { assetId:"CAM-0011", categoryId:C.cam, brand:"Poly",     model:"Studio P5",           color:"Preto",   sn:"PLY-SP5-0011",               status:"EM_USO",   cond:"BOM",   own:"PROPRIO", loc:"Sala de reunião A",resp:null, acq:diasAtras(400), war:diasFrente(200), chk:diasAtras(30), val:1100 },
    { assetId:"CAM-0012", categoryId:C.cam, brand:"Logitech", model:"BRIO 4K Ultra",       color:"Preto",   sn:"LOG-BRIO4K-0012",            status:"EM_ESTOQUE",cond:"NOVO", own:"PROPRIO", loc:"Almoxarifado",    resp:null, acq:diasAtras(8),   war:diasFrente(357), chk:diasAtras(8),  val:1450, sta:diasAtras(8) },

    // ─────── IMPRESSORAS ───────
    { assetId:"IMP-0020", categoryId:C.imp, brand:"Canon",    model:"PIXMA G4110",        color:"Preto",   sn:"CNR-G4110-0020",             status:"EM_USO",   cond:"BOM",   own:"PROPRIO", loc:"SP - Administrativo",resp:null,acq:diasAtras(700), war:diasAtras(340), chk:diasAtras(100), val:950,  notes:"Impressora multifuncional." },
    { assetId:"IMP-0021", categoryId:C.imp, brand:"Brother",  model:"DCP-L3560CDW",       color:"Branco",  sn:"BRO-DCPL356-0021",           status:"EM_USO",   cond:"NOVO",  own:"ALUGADO", loc:"SP - Jurídico",    resp:null, acq:diasAtras(90),  war:diasFrente(275), chk:diasAtras(90), val:2800, notes:"Contrato locação 36 meses." },

    // ─────── HUBS / DOCKS ───────
    { assetId:"HUB-0010", categoryId:C.hub, brand:"CalDigit", model:"TS4 Thunderbolt 4",  color:"Prata",   sn:"CDG-TS4-0010",               status:"EM_USO",   cond:"BOM",   own:"PROPRIO", loc:"SP - TI",          resp:R[0], acq:diasAtras(200), war:diasFrente(165), chk:diasAtras(15), val:2200 },
    { assetId:"HUB-0011", categoryId:C.hub, brand:"Anker",    model:"PowerExpand 13-in-1",color:"Cinza",   sn:"ANK-PE13-0011",              status:"EM_USO",   cond:"NOVO",  own:"PROPRIO", loc:"SP - Diretoria",   resp:R[8], acq:diasAtras(50),  war:diasFrente(315), chk:diasAtras(50), val:680 },
    { assetId:"HUB-0012", categoryId:C.hub, brand:"Dell",     model:"WD22TB4 Thunderbolt 4",color:"Preto", sn:"DL-WD22-0012",               status:"EM_ESTOQUE",cond:"NOVO", own:"PROPRIO", loc:"Almoxarifado",    resp:null, acq:diasAtras(12),  war:diasFrente(353), chk:diasAtras(12), val:1800, sta:diasAtras(12) },

    // ─────── OUTROS ───────
    { assetId:"OUT-0010", categoryId:C.outros, brand:"Intelbras", model:"Switch SG2404 MR",color:"Preto",  sn:"INT-SG2404-0010",tag:"PAT-9010",status:"EM_USO",cond:"BOM",own:"PROPRIO",loc:"SP - TI - Rack",resp:null,acq:diasAtras(800),war:diasAtras(440),chk:diasAtras(60),val:1200,notes:"Switch de rede rack 24 portas." },
    { assetId:"OUT-0011", categoryId:C.outros, brand:"TP-Link",   model:"Archer AX73",     color:"Preto",  sn:"TPL-AX73-0011",              status:"EM_USO",   cond:"BOM",  own:"PROPRIO",loc:"SP - TI - Rack",resp:null,acq:diasAtras(500),war:diasAtras(140),chk:diasAtras(45),val:700,notes:"Roteador Wi-Fi 6." },
    { assetId:"OUT-0012", categoryId:C.outros, brand:"Nobreak CyberPower",model:"CP1350EPFCLCD",color:"Preto",sn:"CYB-CP1350-0012",tag:"PAT-9012",status:"EM_USO",cond:"BOM",own:"PROPRIO",loc:"SP - TI - Rack",resp:null,acq:diasAtras(600),war:diasAtras(240),chk:diasAtras(75),val:1500,notes:"Nobreak 1350VA. Bateria trocada há 6 meses." },
  ];

  let criados = 0;
  let pulados = 0;

  for (const it of itens) {
    const existe = await prisma.equipment.findFirst({ where: { assetId: it.assetId } });
    if (existe) { console.log(`  ⏭️  Já existe: ${it.assetId}`); pulados++; continue; }

    const resp = it.resp;
    await prisma.equipment.create({
      data: {
        assetId:          it.assetId,
        categoryId:       it.categoryId,
        unitId:           unidade.id,
        brand:            it.brand,
        model:            it.model,
        color:            it.color ?? null,
        configuration:    it.config ?? null,
        serialNumber:     it.sn ?? null,
        assetTag:         it.tag ?? null,
        status:           it.status,
        condition:        it.cond,
        ownership:        it.own,
        supplier:         it.supplier ?? null,
        location:         it.loc ?? null,
        currentUserName:  resp?.nome ?? null,
        department:       resp?.dept ?? it.dept ?? null,
        manager:          resp?.gestor ?? null,
        userEmail:        resp?.email ?? null,
        acquisitionDate:  it.acq ?? null,
        deliveryDate:     it.del ?? null,
        warrantyEndDate:  it.war ?? null,
        lastCheckDate:    it.chk ?? null,
        value:            it.val ?? null,
        notes:            it.notes ?? null,
        accessories:      it.acc ?? null,
        imei1:            it.imei1 ?? null,
        imei2:            it.imei2 ?? null,
        statusChangedAt:  it.sta ?? hoje,
      },
    });
    console.log(`  ✅ ${it.assetId} — ${it.brand} ${it.model} [${it.status}]`);
    criados++;
  }

  console.log(`\n✨ Pronto! ${criados} criado(s), ${pulados} já existente(s).`);
}

main()
  .catch((e) => { console.error("❌", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
