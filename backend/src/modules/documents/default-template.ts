// Template PADRÃO do Termo de Responsabilidade (HTML + Handlebars).
// Baseado no modelo oficial da Locagora (Termo de Responsabilidade e Sigilo).
// É gravado no banco no primeiro uso e pode ser editado pela tela
// (Configurações > Termo).
//
// Placeholders disponíveis:
//   {{dataExtenso}}         -> ex.: "01 de julho de 2026"
//   {{usuario.nome}} {{usuario.cpf}} {{usuario.email}}
//   {{usuario.departamento}} {{usuario.gestor}}
//   {{#each equipamentos}} ... {{/each}} com:
//     {{tipo}} {{marca}} {{modelo}} {{cor}} {{serie}} {{patrimonio}}
//     {{imei1}} {{imei2}} {{condicao}} {{acessorios}} {{observacoes}} {{valor}}
//
// OBS.: os dados da empresa (CNPJ/endereço) e o responsável de T.I. estão como
// texto fixo abaixo — edite uma vez aqui (ou em Configurações) para ajustar.
export const DEFAULT_TERMO_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 11px; line-height: 1.5; margin: 32px 40px; }
  .cabecalho { text-align: center; margin-bottom: 18px; }
  .logo { display: inline-block; }
  h1 { font-size: 15px; text-align: center; margin: 10px 0 16px; text-transform: uppercase; }
  h2 { font-size: 12px; margin: 16px 0 6px; color: #1B3690; }
  p { margin: 6px 0; text-align: justify; }
  ul { margin: 4px 0 4px 4px; padding-left: 16px; }
  li { margin: 3px 0; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { border: 1px solid #d1d5db; padding: 5px 7px; text-align: left; vertical-align: top; font-size: 10px; }
  th { background: #eef1f8; }
  .assinaturas { margin-top: 54px; display: flex; justify-content: space-between; gap: 30px; }
  .assinatura { width: 46%; text-align: center; border-top: 1px solid #1f2937; padding-top: 6px; }
  .pequeno { font-size: 10px; color: #6b7280; }
  .local-data { margin-top: 26px; text-align: center; }
</style>
</head>
<body>
  <div class="cabecalho">
    <!-- Logo Locagora "go" -->
    <svg class="logo" width="70" height="50" viewBox="0 0 128 92" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="27" y="6" width="74" height="9" rx="3.5" fill="#45C93A"/>
      <circle cx="43" cy="50" r="16" stroke="#45C93A" stroke-width="11"/>
      <path d="M58.5 42 V68 q0 10 -10 10 h-6" stroke="#45C93A" stroke-width="11" stroke-linecap="round" fill="none"/>
      <circle cx="90" cy="50" r="16" stroke="#45C93A" stroke-width="11"/>
      <path d="M85 43 l8 7 -8 7" stroke="#45C93A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
  </div>

  <h1>Termo de Responsabilidade e Sigilo pelo Uso de Equipamentos Corporativos</h1>

  <p>
    Por este instrumento, a <strong>{{empresa.nome}}</strong>, sediada no endereço
    {{empresa.endereco}}, inscrita no CNPJ sob o nº {{empresa.cnpj}}, e o
    colaborador <strong>{{usuario.nome}}</strong>, portador do CPF nº
    <strong>{{usuario.cpf}}</strong>, doravante denominado simplesmente
    “Colaborador”, ajustam os termos de entrega, recebimento e uso dos
    equipamentos descritos abaixo.
  </p>

  <p><strong>CONSIDERANDO QUE:</strong></p>
  <ul>
    <li>a) A Empresa fornecerá ao Colaborador, em regime de comodato, os equipamentos listados neste termo, com o objetivo exclusivo de viabilizar o desempenho de suas atividades profissionais;</li>
    <li>b) O Colaborador compromete-se a zelar pela boa guarda, conservação, segurança e utilização correta dos bens recebidos;</li>
    <li>c) Os equipamentos e os dados neles contidos são de propriedade exclusiva da Empresa.</li>
  </ul>

  <h2>Cláusula 1 — Do Objeto e Descrição dos Equipamentos</h2>
  <p>
    É objeto deste termo a entrega ao Colaborador, em perfeito estado de
    funcionamento, dos seguintes equipamentos e acessórios:
  </p>
  <table>
    <thead>
      <tr>
        <th>Tipo</th>
        <th>Marca / Modelo</th>
        <th>Cor</th>
        <th>Nº de Série</th>
        <th>Patrimônio</th>
        <th>IMEI</th>
        <th>Acessórios</th>
      </tr>
    </thead>
    <tbody>
      {{#each equipamentos}}
      <tr>
        <td>{{tipo}}</td>
        <td>{{marca}} {{modelo}}</td>
        <td>{{cor}}</td>
        <td>{{serie}}</td>
        <td>{{patrimonio}}</td>
        <td>{{imei1}}</td>
        <td>{{acessorios}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  <p><strong>Observações:</strong>
    {{#each equipamentos}}{{#if observacoes}}[{{tipo}}] {{observacoes}}; {{/if}}{{/each}}
  </p>

  <h2>Cláusula 2 — Das Obrigações e Conduta do Colaborador</h2>
  <p>O Colaborador recebe os equipamentos neste ato e se compromete expressamente a:</p>
  <ul>
    <li>a) Utilizar os equipamentos exclusivamente para atividades profissionais inerentes ao seu cargo, sendo terminantemente proibido o uso pessoal (como salvar fotos pessoais, jogos ou arquivos não relacionados ao trabalho);</li>
    <li>b) Não vender, doar, alugar, emprestar, ceder ou alienar os equipamentos a terceiros (incluindo familiares);</li>
    <li>c) <strong>Segurança da Informação:</strong> Não compartilhar suas senhas de acesso com terceiros ou outros colegas, bem como bloquear a tela do equipamento sempre que se ausentar de sua mesa/estação de trabalho;</li>
    <li>d) <strong>Softwares e Sistemas:</strong> Não formatar, instalar, desinstalar ou alterar sistemas operacionais, softwares ou aplicativos, bem como não baixar arquivos piratas ou de fontes não seguras. Qualquer intervenção técnica é de exclusividade da equipe de T.I.;</li>
    <li>e) <strong>Manutenção:</strong> Não realizar personalizações físicas (adesivos, colagens, marcações) e comunicar imediatamente à T.I. qualquer defeito, lentidão ou necessidade de manutenção;</li>
    <li>f) <strong>Sinistros:</strong> Em caso de perda, roubo ou furto dos equipamentos, comunicar imediatamente à Empresa (para bloqueio remoto e proteção de dados) e apresentar, em até 48 horas, o respectivo Boletim de Ocorrência (B.O.);</li>
    <li>g) <strong>Devolução:</strong> Devolver todos os equipamentos nas mesmas condições em que foram recebidos (salvo desgaste natural pelo uso regular), sempre que solicitado pela Empresa ou imediatamente no ato de seu desligamento.</li>
  </ul>

  <h2>Cláusula 3 — Da Privacidade, Monitoramento e LGPD</h2>
  <p>O Colaborador declara ciência de que:</p>
  <ul>
    <li>a) Por se tratar de ferramenta de trabalho de propriedade da Empresa, não há expectativa de privacidade no uso dos equipamentos;</li>
    <li>b) A Empresa reserva-se o direito de monitorar, auditar, rastrear (geolocalização, no caso de smartphones) e inspecionar remota ou presencialmente os equipamentos, e-mails corporativos, históricos de navegação e arquivos armazenados, a qualquer momento e sem aviso prévio;</li>
    <li>c) O Colaborador deve respeitar as diretrizes da Lei Geral de Proteção de Dados (LGPD), mantendo sigilo absoluto sobre dados de clientes, fornecedores e da própria empresa armazenados nestes dispositivos.</li>
  </ul>

  <h2>Cláusula 4 — Das Obrigações da Empresa</h2>
  <p>A Empresa se compromete a:</p>
  <ul>
    <li>a) Entregar os equipamentos em plenas condições de uso, devidamente configurados e com os softwares necessários licenciados;</li>
    <li>b) Arcar com os custos de manutenção preventiva e corretiva por desgaste natural;</li>
    <li>c) Prestar suporte técnico adequado por meio do departamento de T.I.</li>
  </ul>

  <h2>Cláusula 5 — Das Penalidades e Descontos</h2>
  <p>
    Nos termos do Artigo 462, §1º da CLT, o Colaborador autoriza expressamente o
    desconto em seu salário ou em suas verbas rescisórias dos valores
    correspondentes a:
  </p>
  <ul>
    <li>a) Danos, avarias, perda ou extravio dos equipamentos decorrentes de mau uso, imperícia, imprudência ou negligência (ex.: queda, derramamento de líquidos, deixar o equipamento visível dentro de veículos);</li>
    <li>b) Custos de reparo ou reposição, quando comprovadamente causados por ação ou omissão intencional (dolo) do Colaborador.</li>
  </ul>

  <h2>Cláusula 6 — Disposições Finais</h2>
  <ul>
    <li>a) O presente termo tem validade por prazo indeterminado, enquanto o Colaborador estiver de posse de qualquer equipamento da Empresa;</li>
    <li>b) O não cumprimento das obrigações aqui assumidas caracteriza falta grave e poderá acarretar medidas disciplinares (advertência, suspensão ou demissão por justa causa), além da responsabilização cível e criminal cabível.</li>
  </ul>

  <p>
    E por estarem de perfeito acordo, assinam o presente termo em 02 (duas) vias
    de igual teor, para que produza seus regulares efeitos legais e jurídicos.
  </p>

  <p class="local-data">Belo Horizonte/MG, {{dataExtenso}}.</p>

  <div class="assinaturas">
    <div class="assinatura">
      {{usuario.nome}}
      <div class="pequeno">CPF: {{usuario.cpf}}</div>
      <div class="pequeno">Colaborador</div>
    </div>
    <div class="assinatura">
      KAIQUE SANTOS NASCIMENTO
      <div class="pequeno">CPF: 019.462.446-25</div>
      <div class="pequeno">Responsável T.I. / Representante da Empresa</div>
    </div>
  </div>
</body>
</html>`;
