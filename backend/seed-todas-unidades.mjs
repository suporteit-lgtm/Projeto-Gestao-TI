// Replica equipamentos fictícios para TODAS as unidades que tiverem poucos itens.
// Roda com: node seed-todas-unidades.mjs
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const hoje = new Date();
function diasAtras(n) { const d = new Date(hoje); d.setDate(d.getDate() - n); return d; }
function diasFrente(n) { const d = new Date(hoje); d.setDate(d.getDate() + n); return d; }

// Funcionários fictícios por unidade
const FUNCIONARIOS = {
  "Belo Horizonte": [
    { nome:"Rodrigo Pimentel", dept:"TI",        gestor:"Claudio Torres",  email:"rodrigo.pimentel@locgrupo.com.br" },
    { nome:"Aline Carvalho",   dept:"Financeiro", gestor:"Marcos Andrade",  email:"aline.carvalho@locgrupo.com.br" },
    { nome:"Thiago Borges",    dept:"Comercial",  gestor:"Sonia Meira",     email:"thiago.borges@locgrupo.com.br" },
    { nome:"Renata Figueiredo",dept:"RH",         gestor:"Fernanda Costa",  email:"renata.figueiredo@locgrupo.com.br" },
    { nome:"Daniel Mendes",    dept:"Operações",  gestor:"Paulo Silveira",  email:"daniel.mendes@locgrupo.com.br" },
  ],
  "Maceió": [
    { nome:"Adriana Lopes",    dept:"TI",         gestor:"Marco Aurélio",   email:"adriana.lopes@locgrupo.com.br" },
    { nome:"Fábio Queiroz",    dept:"Comercial",  gestor:"Sandra Lima",     email:"fabio.queiroz@locgrupo.com.br" },
    { nome:"Isabela Freitas",  dept:"Financeiro", gestor:"Carlos Henrique", email:"isabela.freitas@locgrupo.com.br" },
    { nome:"Marcelo Souza",    dept:"Suporte",    gestor:"Marco Aurélio",   email:"marcelo.souza@locgrupo.com.br" },
  ],
  "Aracaju": [
    { nome:"Viviane Teixeira",  dept:"TI",        gestor:"Jorge Batista",   email:"viviane.teixeira@locgrupo.com.br" },
    { nome:"Anderson Costa",    dept:"Comercial", gestor:"Priscila Matos",  email:"anderson.costa@locgrupo.com.br" },
    { nome:"Natalia Barbosa",   dept:"RH",        gestor:"Priscila Matos",  email:"natalia.barbosa@locgrupo.com.br" },
  ],
  "Belém": [
    { nome:"Paulo Henrique",    dept:"TI",        gestor:"Leandro Braga",   email:"paulo.henrique@locgrupo.com.br" },
    { nome:"Simone Almeida",    dept:"Financeiro",gestor:"Leandro Braga",   email:"simone.almeida@locgrupo.com.br" },
    { nome:"Diego Cavalcante",  dept:"Comercial", gestor:"Beatriz Cunha",   email:"diego.cavalcante@locgrupo.com.br" },
    { nome:"Larissa Pinto",     dept:"Suporte",   gestor:"Leandro Braga",   email:"larissa.pinto@locgrupo.com.br" },
  ],
};

// Template de equipamentos por categoria para replicar em cada unidade
// prefixo será substituído pelo código da unidade
function gerarItens(prefixo, cats, responsaveis) {
  const R = responsaveis;
  const r = (i) => R[i % R.length];

  return [
    // Notebooks
    { assetId:`NB-${prefixo}-001`, cat:"Notebook",    brand:"Dell",    model:"Latitude 5540",          config:"i5/16GB/256GB", sn:`DL5540-${prefixo}001`, tag:`PAT-${prefixo}01`, status:"EM_USO",        cond:"BOM",    own:"PROPRIO",  loc:`${prefixo} - TI`,         resp:r(0), acq:diasAtras(365), del:diasAtras(90),  war:diasFrente(275), chk:diasAtras(12), val:5800 },
    { assetId:`NB-${prefixo}-002`, cat:"Notebook",    brand:"Lenovo",  model:"ThinkPad E14 Gen 5",     config:"i7/16GB/512GB", sn:`LNV-E14-${prefixo}002`,             status:"EM_USO",        cond:"BOM",    own:"PROPRIO",  loc:`${prefixo} - Comercial`,  resp:r(1), acq:diasAtras(200), del:diasAtras(180), war:diasFrente(165), chk:diasAtras(18), val:7200 },
    { assetId:`NB-${prefixo}-003`, cat:"Notebook",    brand:"HP",      model:"ProBook 450 G10",        config:"i5/8GB/256GB",  sn:`HP450-${prefixo}003`,               status:"EM_ESTOQUE",    cond:"NOVO",   own:"PROPRIO",  loc:`Almoxarifado ${prefixo}`, resp:null, acq:diasAtras(30),  del:null,           war:diasFrente(335), chk:diasAtras(30), val:5100, sta:diasAtras(30) },
    { assetId:`NB-${prefixo}-004`, cat:"Notebook",    brand:"Acer",    model:"Aspire 5 A515",          config:"i3/8GB/256GB",  sn:`ACR-A515-${prefixo}004`,            status:"EM_USO",        cond:"BOM",    own:"PROPRIO",  loc:`${prefixo} - RH`,         resp:r(3 % R.length), acq:diasAtras(500), del:diasAtras(100), war:diasFrente(100), chk:diasAtras(20), val:2700 },
    { assetId:`NB-${prefixo}-005`, cat:"Notebook",    brand:"Samsung", model:"Galaxy Book4",           config:"i5/8GB/256GB",  sn:`SAM-GB4-${prefixo}005`,             status:"EM_MANUTENCAO", cond:"DEFEITO",own:"PROPRIO",  loc:`Assistência técnica`,     resp:null, acq:diasAtras(700), del:null,           war:diasAtras(35),   chk:diasAtras(55), val:3800, notes:"Tela piscando. Em análise.", sta:diasAtras(8) },

    // Monitores
    { assetId:`MON-${prefixo}-001`, cat:"Monitor",   brand:"LG",      model:"27UK850 4K",              sn:`LG27UK-${prefixo}001`, tag:`PAT-${prefixo}M1`, status:"EM_USO",     cond:"BOM",  own:"PROPRIO", loc:`${prefixo} - TI`,        resp:r(0), acq:diasAtras(400), war:diasFrente(100), chk:diasAtras(15), val:2800 },
    { assetId:`MON-${prefixo}-002`, cat:"Monitor",   brand:"Dell",    model:"P2422H 24\"",             sn:`DLP24-${prefixo}002`,                          status:"EM_USO",     cond:"BOM",  own:"PROPRIO", loc:`${prefixo} - Financeiro`,resp:r(1), acq:diasAtras(600), war:diasAtras(50),   chk:diasAtras(35), val:1800 },
    { assetId:`MON-${prefixo}-003`, cat:"Monitor",   brand:"Samsung", model:"S24B300HL",               sn:`SAM-S24B-${prefixo}003`,                       status:"EM_ESTOQUE", cond:"NOVO", own:"PROPRIO", loc:`Almoxarifado ${prefixo}`,resp:null, acq:diasAtras(5),   war:diasFrente(360), chk:diasAtras(5),  val:1100, sta:diasAtras(5) },

    // Celulares
    { assetId:`CEL-${prefixo}-001`, cat:"Celular",   brand:"Samsung", model:"Galaxy A55 5G",           sn:`SAM-A55-${prefixo}001`, tag:`PAT-${prefixo}C1`,status:"EM_USO",    cond:"BOM",  own:"PROPRIO", loc:`${prefixo} - Comercial`, resp:r(2 % R.length), acq:diasAtras(120), del:diasAtras(110), war:diasFrente(245), chk:diasAtras(25), val:2200 },
    { assetId:`CEL-${prefixo}-002`, cat:"Celular",   brand:"Motorola",model:"Edge 40 Neo",              sn:`MOT-E40N-${prefixo}002`,                       status:"EM_USO",    cond:"NOVO", own:"PROPRIO", loc:`${prefixo} - TI`,        resp:r(0), acq:diasAtras(60),  del:diasAtras(55),  war:diasFrente(305), chk:diasAtras(55), val:1800 },
    { assetId:`CEL-${prefixo}-003`, cat:"Celular",   brand:"Apple",   model:"iPhone 14 128GB",         sn:`APL-IP14-${prefixo}003`,                       status:"EM_ESTOQUE",cond:"BOM",  own:"PROPRIO", loc:`Almoxarifado ${prefixo}`,resp:null, acq:diasAtras(200), war:diasFrente(165), chk:diasAtras(40), val:6000, sta:diasAtras(90) },

    // Periféricos
    { assetId:`CMB-${prefixo}-001`, cat:"Combo mouse/teclado", brand:"Logitech", model:"MK270 Wireless",  sn:`LOG-MK270-${prefixo}001`, status:"EM_USO",     cond:"BOM",  own:"PROPRIO", loc:`${prefixo} - RH`,        resp:r(3 % R.length), acq:diasAtras(400), war:diasFrente(100), chk:diasAtras(30), val:200 },
    { assetId:`FON-${prefixo}-001`, cat:"Fone de ouvido",      brand:"JBL",      model:"Tune 510BT",      sn:`JBL-T510-${prefixo}001`,  status:"EM_USO",     cond:"BOM",  own:"PROPRIO", loc:`${prefixo} - Comercial`, resp:r(2 % R.length), acq:diasAtras(300), war:diasFrente(65),  chk:diasAtras(20), val:350 },
    { assetId:`FON-${prefixo}-002`, cat:"Fone de ouvido",      brand:"Sony",     model:"WH-CH520",        sn:`SNY-CH520-${prefixo}002`, status:"EM_ESTOQUE", cond:"NOVO", own:"PROPRIO", loc:`Almoxarifado ${prefixo}`,resp:null, acq:diasAtras(10),  war:diasFrente(355), chk:diasAtras(10), val:420, sta:diasAtras(10) },

    // Impressora
    { assetId:`IMP-${prefixo}-001`, cat:"Impressora", brand:"HP",    model:"LaserJet MFP M140we",      sn:`HP-LJMFP-${prefixo}001`, tag:`PAT-${prefixo}I1`, status:"EM_USO", cond:"BOM", own:"PROPRIO", loc:`${prefixo} - Administrativo`, resp:null, acq:diasAtras(500), war:diasAtras(140), chk:diasAtras(80), val:1800, notes:"Impressora multifuncional." },

    // Hub / Acessório
    { assetId:`HUB-${prefixo}-001`, cat:"Hub / Dock", brand:"Anker", model:"PowerExpand 7-in-1",       sn:`ANK-PE7-${prefixo}001`,  status:"EM_USO", cond:"BOM", own:"PROPRIO", loc:`${prefixo} - TI`, resp:r(0), acq:diasAtras(250), war:diasFrente(115), chk:diasAtras(18), val:380 },

    // Câmera
    { assetId:`CAM-${prefixo}-001`, cat:"Câmera / Webcam", brand:"Logitech", model:"C920 HD Pro",      sn:`LOG-C920-${prefixo}001`, status:"EM_USO", cond:"BOM", own:"PROPRIO", loc:`Sala reuniões ${prefixo}`, resp:null, acq:diasAtras(400), war:diasAtras(40), chk:diasAtras(30), val:620 },
  ];
}

async function main() {
  console.log("🌐 Adicionando itens a TODAS as unidades...\n");

  const unidades = await p.unit.findMany();
  console.log(`Unidades encontradas: ${unidades.map(u => u.name).join(", ")}\n`);

  async function getOrCreateCat(name, unitId) {
    const ex = await p.category.findFirst({ where: { name, unitId } });
    if (ex) return ex.id;
    return (await p.category.create({ data: { name, unitId } })).id;
  }

  let totalCriados = 0;
  let totalPulados = 0;

  for (const unidade of unidades) {
    // Pega responsáveis da unidade (ou usa um genérico)
    const responsaveis = FUNCIONARIOS[unidade.name] ?? [
      { nome:`Gestor ${unidade.name}`, dept:"TI", gestor:"Administrador", email:`ti@${unidade.name.toLowerCase().replace(/ /g,"-")}.locgrupo.com.br` }
    ];

    // Prefixo único baseado nas primeiras letras da cidade
    const prefixo = unidade.name.substring(0, 2).toUpperCase();

    const itens = gerarItens(prefixo, {}, responsaveis);

    console.log(`📍 ${unidade.name} (${itens.length} itens a criar)`);

    let criados = 0;
    let pulados = 0;

    for (const it of itens) {
      const existe = await p.equipment.findFirst({ where: { assetId: it.assetId } });
      if (existe) { pulados++; continue; }

      const catId = await getOrCreateCat(it.cat, unidade.id);
      const resp = it.resp;

      await p.equipment.create({
        data: {
          assetId:         it.assetId,
          categoryId:      catId,
          unitId:          unidade.id,
          brand:           it.brand,
          model:           it.model,
          color:           it.color ?? null,
          configuration:   it.config ?? null,
          serialNumber:    it.sn ?? null,
          assetTag:        it.tag ?? null,
          status:          it.status,
          condition:       it.cond,
          ownership:       it.own,
          location:        it.loc ?? null,
          currentUserName: resp?.nome ?? null,
          department:      resp?.dept ?? null,
          manager:         resp?.gestor ?? null,
          userEmail:       resp?.email ?? null,
          acquisitionDate: it.acq ?? null,
          deliveryDate:    it.del ?? null,
          warrantyEndDate: it.war ?? null,
          lastCheckDate:   it.chk ?? null,
          value:           it.val ?? null,
          notes:           it.notes ?? null,
          accessories:     it.acc ?? null,
          statusChangedAt: it.sta ?? hoje,
        },
      });
      criados++;
    }

    console.log(`   ✅ ${criados} criado(s)  ⏭️  ${pulados} já existe(m)`);
    totalCriados += criados;
    totalPulados += pulados;
  }

  console.log(`\n✨ Concluído! Total: ${totalCriados} criado(s), ${totalPulados} já existente(s).`);
}

main()
  .catch(e => { console.error("❌", e.message); process.exit(1); })
  .finally(() => p.$disconnect());
