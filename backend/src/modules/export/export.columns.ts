// Definição das colunas "legíveis" usadas na exportação (CSV e Excel) e como
// extrair cada valor de um equipamento.
import { STATUS, CONDITION, OWNERSHIP, StatusKey, ConditionKey, OwnershipKey } from "../equipment/equipment.constants";

type EquipmentWithCategory = any;

function fmtDate(d: Date | null): string {
  if (!d) return "";
  // dd/mm/aaaa (padrão BR)
  return new Date(d).toLocaleDateString("pt-BR");
}

export interface Column {
  header: string;
  get: (eq: EquipmentWithCategory) => string | number;
}

export const exportColumns: Column[] = [
  { header: "ID do Ativo", get: (e) => e.assetId ?? "" },
  { header: "Tipo", get: (e) => e.category?.name ?? "" },
  { header: "Marca", get: (e) => e.brand ?? "" },
  { header: "Modelo", get: (e) => e.model ?? "" },
  { header: "Cor", get: (e) => e.color ?? "" },
  { header: "Configuração", get: (e) => e.configuration ?? "" },
  { header: "Número de Série", get: (e) => e.serialNumber ?? "" },
  { header: "Número de Patrimônio", get: (e) => e.assetTag ?? "" },
  { header: "Status do Ativo", get: (e) => STATUS[e.status as StatusKey] ?? e.status },
  { header: "Condição", get: (e) => CONDITION[e.condition as ConditionKey] ?? e.condition },
  { header: "Propriedade", get: (e) => (e.ownership ? OWNERSHIP[e.ownership as OwnershipKey] ?? e.ownership : "") },
  { header: "Película", get: (e) => e.pelicula ?? "" },
  { header: "Capa", get: (e) => e.capa ?? "" },
  { header: "IMEI 1", get: (e) => e.imei1 ?? "" },
  { header: "IMEI 2", get: (e) => e.imei2 ?? "" },
  { header: "Endereço MAC", get: (e) => e.macAddress ?? "" },
  { header: "Fornecedor", get: (e) => e.supplier ?? "" },
  { header: "Localização", get: (e) => e.location ?? "" },
  { header: "Usuário Atual", get: (e) => e.currentUserName ?? "" },
  { header: "Departamento", get: (e) => e.department ?? "" },
  { header: "Gestor", get: (e) => e.manager ?? "" },
  { header: "E-mail do Usuário", get: (e) => e.userEmail ?? "" },
  { header: "CPF do Usuário", get: (e) => e.userCpf ?? "" },
  { header: "Data de Aquisição", get: (e) => fmtDate(e.acquisitionDate) },
  { header: "Data de Entrega ao Usuário", get: (e) => fmtDate(e.deliveryDate) },
  { header: "Garantia (Data Final)", get: (e) => fmtDate(e.warrantyEndDate) },
  { header: "Última Conferência", get: (e) => fmtDate(e.lastCheckDate) },
  { header: "Valor (R$)", get: (e) => (e.value ?? "") === "" ? "" : Number(e.value) },
  { header: "Observações", get: (e) => e.notes ?? "" },
  { header: "Acessórios", get: (e) => e.accessories ?? "" },
];
