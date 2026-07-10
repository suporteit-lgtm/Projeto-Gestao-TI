import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const units = await p.unit.findMany();
const user = await p.user.findFirst({ where: { email: "murillo.silva@locgrupo.com.br" } });
console.log("Unidades:", JSON.stringify(units.map(u => ({ id: u.id, name: u.name })), null, 2));
console.log("Murillo unitId:", user?.unitId, "| nome:", user?.name);
const eqCount = await p.equipment.groupBy({ by: ["unitId"], _count: true });
console.log("Equipamentos por unidade:", JSON.stringify(eqCount, null, 2));
await p.$disconnect();
