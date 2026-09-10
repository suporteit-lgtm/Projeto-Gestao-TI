// Os três tipos de termo que o sistema gera, com o texto padrão de cada um.
//
// O texto e o layout seguem os termos que a empresa já usa (conferidos contra
// os PDFs assinados no Clicksign): equipamentos em lista corrida, três blocos
// de assinatura (colaborador, responsável de T.I. e empresa) e o logo no topo.
//
// Cada tipo é uma linha da tabela DocumentTemplate, identificada pelo id
// numérico abaixo. O id 1 é o Termo de Responsabilidade, que já existia — assim
// o texto que a empresa personalizou continua valendo, e não é preciso mexer no
// banco para ganhar os outros dois.
//
// Placeholders disponíveis nos três:
//   {{dataExtenso}}
//   {{empresa.nome}} {{empresa.cnpj}} {{empresa.endereco}}
//   {{usuario.nome}} {{usuario.cpf}} {{usuario.email}}
//   {{usuario.departamento}} {{usuario.gestor}}
//   {{#each equipamentos}} ... {{/each}} com:
//     {{tipo}} {{marca}} {{modelo}} {{cor}} {{serie}} {{patrimonio}}
//     {{imei1}} {{imei2}} {{condicao}} {{acessorios}} {{observacoes}} {{valor}}

export const TIPOS_TERMO = ["RESPONSABILIDADE", "COMODATO", "DEVOLUCAO"] as const;
export type TipoTermo = (typeof TIPOS_TERMO)[number];

export const TIPO_TERMO_PADRAO: TipoTermo = "RESPONSABILIDADE";

// Dados fixos que aparecem no rodapé das assinaturas. Trocáveis por ambiente,
// para não precisar editar os três modelos quando a pessoa responsável mudar.
const TECNICO_NOME = process.env.TERMO_TECNICO_NOME || "Kaique Santos";
const TECNICO_CPF = process.env.TERMO_TECNICO_CPF || "019.462.446-35";

const ESTILO = `<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 11px; line-height: 1.6; margin: 30px 38px; }
  .cabecalho { text-align: center; margin-bottom: 16px; }
  .cabecalho img { height: 44px; }
  h1 { font-size: 13px; text-align: center; margin: 6px 0 16px; text-transform: uppercase; letter-spacing: .3px; }
  h2 { font-size: 11px; margin: 15px 0 5px; text-transform: uppercase; letter-spacing: .3px; }
  p { margin: 7px 0; text-align: justify; }
  .itens { margin: 8px 0 10px; }
  .item { margin: 2px 0; }
  .assinaturas { margin-top: 40px; }
  .assinatura { margin-top: 26px; }
  .linha { border-top: 1px solid #1f2937; width: 300px; margin-bottom: 4px; }
  .pequeno { font-size: 10px; color: #4b5563; }
  .local-data { margin-top: 24px; }
  .rodape { margin-top: 34px; text-align: center; font-size: 9px; color: #9ca3af; }
</style>`;

// O logo é servido pelo próprio app (frontend/public/logo.png), e o PDF é
// montado no navegador — então o caminho relativo resolve na mesma origem.
const CABECALHO = `<div class="cabecalho">
    <img src="/logo.png" alt="Locagora" />
  </div>`;

// Lista corrida dos equipamentos: "Marca Modelo — PAT 0527 (S/N ...)", o mesmo
// formato dos termos que a empresa já emitiu.
const LISTA_EQUIPAMENTOS = `<div class="itens">
    {{#each equipamentos}}
    <div class="item">{{marca}} {{modelo}} — PAT {{patrimonio}} (S/N {{serie}}{{#if imei1}}, IMEI {{imei1}}{{/if}})</div>
    {{/each}}
  </div>`;

// Três blocos: colaborador, responsável de T.I. e empresa.
const ASSINATURAS = (papelDoColaborador: string) => `<div class="assinaturas">
    <div class="assinatura">
      <div class="linha"></div>
      {{usuario.nome}}
      <div class="pequeno">CPF: {{usuario.cpf}}</div>
      <div class="pequeno">${papelDoColaborador}</div>
    </div>

    <div class="assinatura">
      <div class="linha"></div>
      ${TECNICO_NOME}
      <div class="pequeno">CPF: ${TECNICO_CPF}</div>
      <div class="pequeno">Responsável T.I. / Representante da Empresa</div>
    </div>

    <div class="assinatura">
      <div class="linha"></div>
      {{empresa.nome}}
      <div class="pequeno">CNPJ: {{empresa.cnpj}}</div>
      <div class="pequeno">Empresa</div>
    </div>
  </div>

  <div class="rodape">Locagora — Grupo LOC · Inventário de Equipamentos</div>`;

const RESPONSABILIDADE_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
${ESTILO}
</head>
<body>
  ${CABECALHO}

  <h1>Termo de Responsabilidade e Sigilo pelo Uso de Equipamentos Corporativos</h1>

  <p>
    Por este instrumento, a <strong>{{empresa.nome}}</strong>, sediada no endereço
    {{empresa.endereco}}, inscrita no CNPJ sob o nº {{empresa.cnpj}}, e o
    colaborador <strong>{{usuario.nome}}</strong>, portador do CPF nº
    <strong>{{usuario.cpf}}</strong>, doravante denominado simplesmente
    “Colaborador”, ajustam os termos de entrega, recebimento e uso dos
    equipamentos descritos abaixo.
  </p>

  <p>
    <strong>CONSIDERANDO QUE:</strong> a) A Empresa fornecerá ao Colaborador, em
    regime de comodato, os equipamentos listados neste termo, com o objetivo
    exclusivo de viabilizar o desempenho de suas atividades profissionais;
    b) O Colaborador compromete-se a zelar pela boa guarda, conservação,
    segurança e utilização correta dos bens recebidos; c) Os equipamentos e os
    dados neles contidos são de propriedade exclusiva da Empresa.
  </p>

  <h2>Cláusula 1 – Do Objeto e Descrição dos Equipamentos</h2>
  <p>
    É objeto deste termo a entrega ao Colaborador, em perfeito estado de
    funcionamento, dos seguintes equipamentos e acessórios:
  </p>
  ${LISTA_EQUIPAMENTOS}

  <h2>Cláusula 2 – Das Obrigações e Conduta do Colaborador</h2>
  <p>
    O Colaborador recebe os equipamentos neste ato e se compromete expressamente
    a: a) Utilizar os equipamentos exclusivamente para atividades profissionais
    inerentes ao seu cargo, sendo terminantemente proibido o uso pessoal (como
    salvar fotos pessoais, jogos ou arquivos não relacionados ao trabalho);
    b) Não vender, doar, alugar, emprestar, ceder ou alienar os equipamentos a
    terceiros (incluindo familiares); c) <strong>Segurança da Informação:</strong>
    Não compartilhar suas senhas de acesso com terceiros ou outros colegas, bem
    como bloquear a tela do equipamento sempre que se ausentar de sua
    mesa/estação de trabalho; d) <strong>Softwares e Sistemas:</strong> Não
    formatar, instalar, desinstalar ou alterar sistemas operacionais, softwares
    ou aplicativos, bem como não baixar arquivos piratas ou de fontes não
    seguras. Qualquer intervenção técnica é de exclusividade da equipe de T.I.;
    e) <strong>Manutenção:</strong> Não realizar personalizações físicas
    (adesivos, colagens, marcações) e comunicar imediatamente à T.I. qualquer
    defeito, lentidão ou necessidade de manutenção; f) <strong>Sinistros:</strong>
    Em caso de perda, roubo ou furto dos equipamentos, comunicar imediatamente à
    Empresa (para bloqueio remoto e proteção de dados) e apresentar, em até 48
    horas, o respectivo Boletim de Ocorrência (B.O.); g) <strong>Devolução:</strong>
    Devolver todos os equipamentos nas mesmas condições em que foram recebidos
    (salvo desgaste natural pelo uso regular), sempre que solicitado pela Empresa
    ou imediatamente no ato de seu desligamento.
  </p>

  <h2>Cláusula 3 – Da Privacidade, Monitoramento e LGPD</h2>
  <p>
    O Colaborador declara ciência de que: a) Por se tratar de ferramenta de
    trabalho de propriedade da Empresa, não há expectativa de privacidade no uso
    dos equipamentos; b) A Empresa reserva-se o direito de monitorar, auditar,
    rastrear (geolocalização, no caso de smartphones) e inspecionar remotamente
    ou presencialmente os equipamentos, e-mails corporativos, históricos de
    navegação e arquivos armazenados, a qualquer momento e sem aviso prévio;
    c) O Colaborador deve respeitar as diretrizes da Lei Geral de Proteção de
    Dados (LGPD), mantendo sigilo absoluto sobre dados de clientes, fornecedores
    e da própria empresa armazenados nestes dispositivos.
  </p>

  <h2>Cláusula 4 – Das Obrigações da Empresa</h2>
  <p>
    A Empresa se compromete a: a) Entregar os equipamentos em plenas condições de
    uso, devidamente configurados e com os softwares necessários licenciados;
    b) Arcar com os custos de manutenção preventiva e corretiva por desgaste
    natural; c) Prestar suporte técnico adequado por meio do departamento de T.I.
  </p>

  <h2>Cláusula 5 – Das Penalidades e Descontos</h2>
  <p>
    Nos termos do Artigo 462, § 1º da CLT, o Colaborador autoriza expressamente o
    desconto em seu salário ou em suas verbas rescisórias dos valores
    correspondentes a: a) Danos, avarias, perda ou extravio dos equipamentos
    decorrentes de mau uso, imperícia, imprudência ou negligência (ex: queda,
    derramamento de líquidos, deixar o equipamento visível dentro de veículos);
    b) Custos de reparo ou reposição, quando comprovadamente causados por ação ou
    omissão intencional (dolo) do Colaborador.
  </p>

  <h2>Cláusula 6 – Disposições Finais</h2>
  <p>
    a) O presente termo tem validade por prazo indeterminado, enquanto o
    Colaborador estiver de posse de qualquer equipamento da Empresa; b) O não
    cumprimento das obrigações aqui assumidas caracteriza falta grave e poderá
    acarretar medidas disciplinares (advertência, suspensão ou demissão por justa
    causa), além da responsabilização cível e criminal cabível.
  </p>

  <p>
    E por estarem de perfeito acordo, assinam o presente termo em 02 (duas) vias
    de igual teor, para que produza seus regulares efeitos legais e jurídicos.
  </p>

  <p class="local-data">Belo Horizonte/MG, {{dataExtenso}}.</p>

  ${ASSINATURAS("Colaborador")}
</body>
</html>`;

const DEVOLUCAO_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
${ESTILO}
</head>
<body>
  ${CABECALHO}

  <h1>Termo de Devolução de Equipamentos Corporativos</h1>

  <p>
    Por este instrumento, a <strong>{{empresa.nome}}</strong>, sediada no endereço
    {{empresa.endereco}}, inscrita no CNPJ sob o nº {{empresa.cnpj}}, declara ter
    recebido do colaborador <strong>{{usuario.nome}}</strong>, portador do CPF nº
    <strong>{{usuario.cpf}}</strong>, doravante denominado simplesmente
    “Colaborador”, os equipamentos corporativos abaixo descritos, outrora cedidos
    para o exercício de suas funções.
  </p>

  <h2>Cláusula 1 – Dos Equipamentos Devolvidos</h2>
  <p>
    O Colaborador devolve neste ato os seguintes equipamentos e acessórios
    pertencentes à Empresa:
  </p>
  ${LISTA_EQUIPAMENTOS}

  <h2>Cláusula 2 – Do Estado de Conservação e Vistoria</h2>
  <p>
    Os equipamentos foram inspecionados neste ato pelo departamento de T.I. e
    encontram-se:
  </p>
  <p>
    ( X ) Em perfeito estado de conservação e funcionamento, ressalvado o
    desgaste natural de uso.
  </p>
  <p>
    (&nbsp;&nbsp;&nbsp;) Com as seguintes avarias, faltas ou observações:
    ________________________________________.
  </p>

  <h2>Cláusula 3 – Da Quitação e Responsabilidades</h2>
  <p>
    a) Estando os equipamentos em perfeito estado (ressalvado o desgaste
    natural), a Empresa confere ao Colaborador/Prestador ampla e geral quitação
    quanto à guarda e devolução dos bens. b) Caso tenham sido constatadas
    avarias, danos físicos ou extravios (assinalados na Cláusula 2) decorrentes
    de mau uso, negligência, imprudência ou dolo, fica resguardado à Empresa o
    direito de exigir o ressarcimento e realizar os descontos correspondentes aos
    custos de reparo ou reposição. Tais descontos poderão ser efetuados:
  </p>
  <p>
    I. Nas verbas rescisórias ou salário do Colaborador, caso o vínculo seja
    regido pela Consolidação das Leis do Trabalho (conforme Artigo 462, § 1º da
    CLT); ou
  </p>
  <p>
    II. Nos honorários, notas fiscais ou quaisquer pagamentos pendentes devidos
    ao Prestador de Serviços (PJ), em conformidade com as regras de
    responsabilização civil previstas no Código Civil Brasileiro.
  </p>

  <p>
    Uma via deste termo será enviada ao e-mail pessoal do ex-colaborador:
    {{usuario.email}}
  </p>

  <p>
    E por estarem de perfeito acordo, as partes firmam o presente termo por meio
    de assinatura eletrônica, reconhecendo a validade jurídica desta modalidade,
    para que produza todos os seus regulares efeitos de direito.
  </p>

  <p class="local-data">Belo Horizonte/MG, {{dataExtenso}}.</p>

  ${ASSINATURAS("Colaborador")}
</body>
</html>`;

const COMODATO_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
${ESTILO}
</head>
<body>
  ${CABECALHO}

  <h1>Contrato de Comodato de Equipamentos Corporativos</h1>

  <p>
    Por este instrumento, a <strong>{{empresa.nome}}</strong>, sediada no endereço
    {{empresa.endereco}}, inscrita no CNPJ sob o nº {{empresa.cnpj}}, doravante
    denominada <strong>COMODANTE</strong>, e <strong>{{usuario.nome}}</strong>,
    portador do CPF nº <strong>{{usuario.cpf}}</strong>, doravante denominado
    <strong>COMODATÁRIO</strong>, celebram o presente Contrato de Comodato, que se
    regerá pelos artigos 579 a 585 do Código Civil e pelas cláusulas a seguir.
  </p>

  <h2>Cláusula 1 – Do Objeto</h2>
  <p>
    A COMODANTE empresta gratuitamente ao COMODATÁRIO, em caráter precário, os
    bens abaixo descritos, entregues em perfeito estado de funcionamento e
    conservação:
  </p>
  ${LISTA_EQUIPAMENTOS}

  <h2>Cláusula 2 – Da Propriedade e da Finalidade</h2>
  <p>
    a) Os bens permanecem sendo de propriedade exclusiva da COMODANTE, não se
    transferindo ao COMODATÁRIO qualquer direito sobre eles; b) O empréstimo é
    gratuito e destina-se exclusivamente ao desempenho das atividades
    profissionais do COMODATÁRIO; c) É vedado emprestar, sublocar, ceder, doar,
    vender ou dar os bens em garantia a terceiros, ainda que familiares.
  </p>

  <h2>Cláusula 3 – Do Prazo</h2>
  <p>
    O comodato vigora por prazo indeterminado, enquanto durar o vínculo entre as
    partes, podendo a COMODANTE requerer a restituição dos bens a qualquer tempo,
    mediante simples comunicação.
  </p>

  <h2>Cláusula 4 – Da Conservação e da Restituição</h2>
  <p>
    a) O COMODATÁRIO obriga-se a conservar os bens como se seus fossem, arcando
    com as despesas de uso e gozo, conforme o artigo 584 do Código Civil; b) Os
    bens devem ser restituídos nas mesmas condições em que foram recebidos,
    ressalvado o desgaste natural decorrente do uso regular; c) A restituição
    deve ocorrer ao término do vínculo ou sempre que solicitada, sob pena de
    caracterizar esbulho possessório, nos termos do artigo 582 do Código Civil.
  </p>

  <h2>Cláusula 5 – Da Responsabilidade por Perdas e Danos</h2>
  <p>
    a) Responde o COMODATÁRIO por perda, furto, roubo ou avaria dos bens
    decorrentes de mau uso, imprudência, imperícia ou negligência; b) Em caso de
    furto ou roubo, deverá comunicar imediatamente a COMODANTE e apresentar o
    Boletim de Ocorrência em até 48 (quarenta e oito) horas; c) Nos termos do
    artigo 462, § 1º da CLT, autoriza o desconto em salário ou verbas rescisórias
    dos valores correspondentes aos danos apurados.
  </p>

  <h2>Cláusula 6 – Disposições Finais</h2>
  <p>
    a) Este contrato substitui quaisquer ajustes verbais anteriores sobre os
    mesmos bens; b) As partes elegem o foro da comarca de Belo Horizonte/MG para
    dirimir eventuais controvérsias.
  </p>

  <p>
    E por estarem de perfeito acordo, as partes firmam o presente contrato por
    meio de assinatura eletrônica, reconhecendo a validade jurídica desta
    modalidade, para que produza todos os seus regulares efeitos de direito.
  </p>

  <p class="local-data">Belo Horizonte/MG, {{dataExtenso}}.</p>

  ${ASSINATURAS("Comodatário")}
</body>
</html>`;

interface DefinicaoTipo {
  id: number; // linha na tabela DocumentTemplate
  nome: string;
  descricao: string;
  padrao: string;
}

export const DEFINICAO_TIPOS: Record<TipoTermo, DefinicaoTipo> = {
  RESPONSABILIDADE: {
    id: 1,
    nome: "Termo de Responsabilidade",
    descricao: "Entrega dos equipamentos e as obrigações de quem os recebe.",
    padrao: RESPONSABILIDADE_TEMPLATE,
  },
  COMODATO: {
    id: 2,
    nome: "Termo de Comodato",
    descricao: "Empréstimo gratuito dos bens, nos termos do Código Civil.",
    padrao: COMODATO_TEMPLATE,
  },
  DEVOLUCAO: {
    id: 3,
    nome: "Termo de Devolução",
    descricao: "Comprovante de que os equipamentos voltaram para a empresa.",
    padrao: DEVOLUCAO_TEMPLATE,
  },
};

// Converte o que veio da requisição num tipo válido (o padrão quando ausente).
export function tipoTermoDe(valor: unknown): TipoTermo {
  const v = String(valor ?? "").toUpperCase();
  return (TIPOS_TERMO as readonly string[]).includes(v)
    ? (v as TipoTermo)
    : TIPO_TERMO_PADRAO;
}
