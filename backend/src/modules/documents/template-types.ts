// Os três tipos de termo que o sistema gera, com o texto padrão de cada um.
//
// Cada tipo é uma linha da tabela DocumentTemplate, identificada pelo id
// numérico abaixo. O id 1 é o Termo de Responsabilidade, que já existia — assim
// o texto que a empresa já personalizou continua valendo, e não é preciso mexer
// no banco para ganhar os outros dois.
//
// Placeholders disponíveis nos três (iguais aos do termo de responsabilidade):
//   {{dataExtenso}}
//   {{empresa.nome}} {{empresa.cnpj}} {{empresa.endereco}}
//   {{usuario.nome}} {{usuario.cpf}} {{usuario.email}}
//   {{usuario.departamento}} {{usuario.gestor}}
//   {{#each equipamentos}} ... {{/each}} com:
//     {{tipo}} {{marca}} {{modelo}} {{cor}} {{serie}} {{patrimonio}}
//     {{imei1}} {{imei2}} {{condicao}} {{acessorios}} {{observacoes}} {{valor}}
import { DEFAULT_TERMO_TEMPLATE } from "./default-template";

export const TIPOS_TERMO = ["RESPONSABILIDADE", "COMODATO", "DEVOLUCAO"] as const;
export type TipoTermo = (typeof TIPOS_TERMO)[number];

export const TIPO_TERMO_PADRAO: TipoTermo = "RESPONSABILIDADE";

// Mesmo estilo e cabeçalho do termo de responsabilidade, para os três saírem
// com a mesma cara.
const ESTILO = `<style>
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
</style>`;

const CABECALHO = `<div class="cabecalho">
    <svg class="logo" width="70" height="50" viewBox="0 0 128 92" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="27" y="6" width="74" height="9" rx="3.5" fill="#45C93A"/>
      <circle cx="43" cy="50" r="16" stroke="#45C93A" stroke-width="11"/>
      <path d="M58.5 42 V68 q0 10 -10 10 h-6" stroke="#45C93A" stroke-width="11" stroke-linecap="round" fill="none"/>
      <circle cx="90" cy="50" r="16" stroke="#45C93A" stroke-width="11"/>
      <path d="M85 43 l8 7 -8 7" stroke="#45C93A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
  </div>`;

const ASSINATURAS = (papelDoColaborador: string) => `<div class="assinaturas">
    <div class="assinatura">
      {{usuario.nome}}
      <div class="pequeno">CPF: {{usuario.cpf}}</div>
      <div class="pequeno">${papelDoColaborador}</div>
    </div>
    <div class="assinatura">
      KAIQUE SANTOS NASCIMENTO
      <div class="pequeno">CPF: 019.462.446-25</div>
      <div class="pequeno">Responsável T.I. / Representante da Empresa</div>
    </div>
  </div>`;

const COMODATO_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
${ESTILO}
</head>
<body>
  ${CABECALHO}

  <h1>Contrato de Comodato de Equipamentos</h1>

  <p>
    <strong>COMODANTE:</strong> {{empresa.nome}}, sediada no endereço
    {{empresa.endereco}}, inscrita no CNPJ sob o nº {{empresa.cnpj}}.
  </p>
  <p>
    <strong>COMODATÁRIO(A):</strong> {{usuario.nome}}, portador(a) do CPF nº
    {{usuario.cpf}}, lotado(a) no setor {{usuario.departamento}}.
  </p>

  <p>
    As partes acima qualificadas celebram o presente Contrato de Comodato, que se
    regerá pelos artigos 579 a 585 do Código Civil e pelas cláusulas a seguir.
  </p>

  <h2>Cláusula 1 — Do Objeto</h2>
  <p>
    A COMODANTE empresta gratuitamente ao(à) COMODATÁRIO(A), em caráter precário,
    os bens abaixo descritos, que são entregues em perfeito estado de
    funcionamento e conservação:
  </p>
  <table>
    <thead>
      <tr>
        <th>Tipo</th>
        <th>Marca / Modelo</th>
        <th>Nº de Série</th>
        <th>Patrimônio</th>
        <th>IMEI</th>
        <th>Condição</th>
        <th>Valor (R$)</th>
      </tr>
    </thead>
    <tbody>
      {{#each equipamentos}}
      <tr>
        <td>{{tipo}}</td>
        <td>{{marca}} {{modelo}}</td>
        <td>{{serie}}</td>
        <td>{{patrimonio}}</td>
        <td>{{imei1}}</td>
        <td>{{condicao}}</td>
        <td>{{valor}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  <p><strong>Acessórios e observações:</strong>
    {{#each equipamentos}}{{#if acessorios}}[{{tipo}}] {{acessorios}}; {{/if}}{{#if observacoes}}[{{tipo}}] {{observacoes}}; {{/if}}{{/each}}
  </p>

  <h2>Cláusula 2 — Da Propriedade e da Finalidade</h2>
  <ul>
    <li>a) Os bens permanecem sendo de propriedade exclusiva da COMODANTE, não se transferindo ao(à) COMODATÁRIO(A) qualquer direito sobre eles;</li>
    <li>b) O empréstimo é gratuito e destina-se exclusivamente ao desempenho das atividades profissionais do(a) COMODATÁRIO(A);</li>
    <li>c) É vedado emprestar, sublocar, ceder, doar, vender ou dar os bens em garantia a terceiros, ainda que familiares.</li>
  </ul>

  <h2>Cláusula 3 — Do Prazo</h2>
  <p>
    O comodato vigora por prazo indeterminado, enquanto durar o vínculo entre as
    partes, podendo a COMODANTE requerer a restituição dos bens a qualquer tempo,
    mediante simples comunicação.
  </p>

  <h2>Cláusula 4 — Da Conservação e da Restituição</h2>
  <ul>
    <li>a) O(A) COMODATÁRIO(A) obriga-se a conservar os bens como se seus fossem, arcando com as despesas de uso e gozo, conforme o artigo 584 do Código Civil;</li>
    <li>b) Os bens devem ser restituídos nas mesmas condições em que foram recebidos, ressalvado o desgaste natural decorrente do uso regular;</li>
    <li>c) A restituição deve ocorrer ao término do vínculo ou sempre que solicitada, sob pena de caracterizar esbulho possessório, nos termos do artigo 582 do Código Civil.</li>
  </ul>

  <h2>Cláusula 5 — Da Responsabilidade por Perdas e Danos</h2>
  <ul>
    <li>a) Responde o(a) COMODATÁRIO(A) por perda, furto, roubo ou avaria dos bens decorrentes de mau uso, imprudência, imperícia ou negligência;</li>
    <li>b) Em caso de furto ou roubo, deverá comunicar imediatamente a COMODANTE e apresentar o Boletim de Ocorrência em até 48 (quarenta e oito) horas;</li>
    <li>c) Nos termos do artigo 462, §1º da CLT, autoriza o desconto em salário ou verbas rescisórias dos valores correspondentes aos danos apurados.</li>
  </ul>

  <h2>Cláusula 6 — Disposições Finais</h2>
  <ul>
    <li>a) Este contrato substitui quaisquer ajustes verbais anteriores sobre os mesmos bens;</li>
    <li>b) As partes elegem o foro da comarca de Belo Horizonte/MG para dirimir eventuais controvérsias.</li>
  </ul>

  <p>
    E por estarem de perfeito acordo, assinam o presente contrato em 02 (duas)
    vias de igual teor.
  </p>

  <p class="local-data">Belo Horizonte/MG, {{dataExtenso}}.</p>

  ${ASSINATURAS("Comodatário(a)")}
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

  <h1>Termo de Devolução de Equipamentos</h1>

  <p>
    Pelo presente instrumento, <strong>{{usuario.nome}}</strong>, portador(a) do
    CPF nº <strong>{{usuario.cpf}}</strong>, lotado(a) no setor
    {{usuario.departamento}}, DEVOLVE à <strong>{{empresa.nome}}</strong>,
    inscrita no CNPJ sob o nº {{empresa.cnpj}}, os equipamentos abaixo
    relacionados, que estavam sob sua guarda e responsabilidade.
  </p>

  <h2>Equipamentos devolvidos</h2>
  <table>
    <thead>
      <tr>
        <th>Tipo</th>
        <th>Marca / Modelo</th>
        <th>Nº de Série</th>
        <th>Patrimônio</th>
        <th>IMEI</th>
        <th>Condição na devolução</th>
        <th>Acessórios</th>
      </tr>
    </thead>
    <tbody>
      {{#each equipamentos}}
      <tr>
        <td>{{tipo}}</td>
        <td>{{marca}} {{modelo}}</td>
        <td>{{serie}}</td>
        <td>{{patrimonio}}</td>
        <td>{{imei1}}</td>
        <td>{{condicao}}</td>
        <td>{{acessorios}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <h2>Observações sobre o estado dos bens</h2>
  <p>
    {{#each equipamentos}}{{#if observacoes}}[{{tipo}}] {{observacoes}}; {{/if}}{{/each}}
  </p>
  <p class="pequeno">
    Avarias, faltas de acessórios ou qualquer divergência devem ser registradas
    acima ANTES da assinatura. A ausência de ressalvas significa que os bens
    foram recebidos em condições regulares de uso.
  </p>

  <h2>Declarações</h2>
  <ul>
    <li>a) O(A) colaborador(a) declara que devolveu todos os equipamentos, acessórios e mídias que estavam sob sua responsabilidade, não retendo cópias de arquivos, dados ou informações da Empresa;</li>
    <li>b) A Empresa declara ter recebido os bens acima nas condições descritas, dando quitação quanto à sua guarda, ressalvadas as avarias eventualmente registradas neste termo;</li>
    <li>c) Permanecem em vigor as obrigações de sigilo e confidencialidade assumidas pelo(a) colaborador(a), que subsistem ao encerramento da posse dos equipamentos;</li>
    <li>d) Constatada, após conferência técnica, avaria não registrada neste termo e decorrente de mau uso, aplicam-se as penalidades previstas no termo de responsabilidade firmado anteriormente.</li>
  </ul>

  <p>
    E por estarem de acordo, assinam o presente termo em 02 (duas) vias de igual
    teor.
  </p>

  <p class="local-data">Belo Horizonte/MG, {{dataExtenso}}.</p>

  ${ASSINATURAS("Colaborador(a) — devolveu")}
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
    padrao: DEFAULT_TERMO_TEMPLATE,
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
