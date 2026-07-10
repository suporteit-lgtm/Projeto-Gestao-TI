// Configurações do sistema (linha única). Garante que a linha exista.
import { prisma } from "../../config/prisma";

// Configurações (limites de alerta) por UNIDADE. Cria a linha se ainda não existir.
export async function getSettings(unitId: string) {
  let s = await prisma.settings.findUnique({ where: { unitId } });
  if (!s) {
    s = await prisma.settings.create({ data: { unitId } });
  }
  return s;
}
