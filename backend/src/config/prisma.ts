// Instância única (singleton) do Prisma Client, reaproveitada em todo o backend.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
