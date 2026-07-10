// Contexto de dados compartilhados (categorias e listas fixas de Status/Condição/
// Propriedade). Carrega UMA vez após o login e reaproveita em todas as telas —
// evita rebuscar a cada navegação, deixando a troca de páginas instantânea.
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api } from "../api/client";
import { Category, MetaOption } from "../types";

interface DataContextValue {
  categories: Category[];
  status: MetaOption[];
  condition: MetaOption[];
  ownership: MetaOption[];
  reloadCategories: () => Promise<void>;
}

const DataContext = createContext<DataContextValue>(null as any);

export function DataProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<MetaOption[]>([]);
  const [condition, setCondition] = useState<MetaOption[]>([]);
  const [ownership, setOwnership] = useState<MetaOption[]>([]);

  const reloadCategories = useCallback(async () => {
    try {
      setCategories(await api<Category[]>("/categories"));
    } catch {
      /* silencioso: telas mostram erro na listagem principal */
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const meta = await api<{ status: MetaOption[]; condition: MetaOption[]; ownership: MetaOption[] }>(
          "/meta"
        );
        setStatus(meta.status);
        setCondition(meta.condition);
        setOwnership(meta.ownership ?? []);
      } catch {
        /* ignora — sem sessão as telas redirecionam para o login */
      }
      await reloadCategories();
    })();
  }, [reloadCategories]);

  return (
    <DataContext.Provider value={{ categories, status, condition, ownership, reloadCategories }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
