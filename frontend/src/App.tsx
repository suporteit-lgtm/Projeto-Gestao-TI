// Roteador principal + proteção de rotas por autenticação/papel.
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { Spinner } from "./components/ui";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import EquipmentDetail from "./pages/EquipmentDetail";
import Alerts from "./pages/Alerts";
import ImportPage from "./pages/Import";
import Users from "./pages/Users";
import Settings from "./pages/Settings";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner label="Iniciando..." />;
  if (!user) return <Login />;

  return (
    <DataProvider>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventario" element={<Inventory />} />
        <Route path="/equipamento/:id" element={<EquipmentDetail />} />
        <Route path="/alertas" element={<Alerts />} />
        <Route path="/importar" element={<ImportPage />} />
        <Route path="/configuracoes" element={<Settings />} />
        {/* Gestão de usuários apenas para admin */}
        <Route
          path="/usuarios"
          element={user.role === "ADMIN" ? <Users /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
    </DataProvider>
  );
}
