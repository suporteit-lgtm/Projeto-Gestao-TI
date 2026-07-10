// Tipos compartilhados pelo frontend.

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "COMMON";
  unitId: string;
  unitName: string;
}

export interface Category {
  id: string;
  name: string;
  count?: number;
}

export interface Assignment {
  id: string;
  userName: string;
  userEmail: string | null;
  department: string | null;
  manager: string | null;
  startDate: string;
  endDate: string | null;
  note: string | null;
}

export interface Equipment {
  id: string;
  assetId: string;
  categoryId: string;
  category?: Category;
  brand: string | null;
  model: string | null;
  color: string | null;
  configuration: string | null;
  serialNumber: string | null;
  assetTag: string | null;
  status: string;
  condition: string;
  ownership: string | null;
  pelicula: string | null;
  capa: string | null;
  imei1: string | null;
  imei2: string | null;
  macAddress: string | null;
  supplier: string | null;
  location: string | null;
  currentUserName: string | null;
  department: string | null;
  manager: string | null;
  userEmail: string | null;
  userCpf: string | null;
  acquisitionDate: string | null;
  deliveryDate: string | null;
  warrantyEndDate: string | null;
  lastCheckDate: string | null;
  value: number | null;
  notes: string | null;
  accessories: string | null;
  assignments?: Assignment[];
}

export interface MetaOption {
  key: string;
  label: string;
}

export interface Unit {
  id: string;
  name: string;
  cnpj: string | null;
  address: string | null;
}
