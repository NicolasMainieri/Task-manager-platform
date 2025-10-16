import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Dashboard from './DashboardComplete.tsx';
import AdminPanel from './AdminPanelComplete.tsx';

const DashboardRouter = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  // ✅ Controlla se l'utente è admin in vari modi
  const userAny = user as any;

  // Controlla il ruolo
  const hasAdminRole = userAny?.role?.nome === "Admin";

  // Controlla i permessi
  const hasAdminPermission = userAny?.role?.permessi?.isAdmin === true;

  // Controlla se è proprietario di un'azienda (ha adminCompany O è l'adminUserId della company)
  const isCompanyOwner = !!userAny?.adminCompany || (userAny?.company?.adminUserId === userAny?.id);

  const isAdmin = hasAdminRole || hasAdminPermission || isCompanyOwner;

  console.log('🔍 DashboardRouter Debug:', {
    email: userAny?.email,
    roleName: userAny?.role?.nome,
    rolePermissions: userAny?.role?.permessi,
    hasAdminRole,
    hasAdminPermission,
    isCompanyOwner,
    adminCompany: userAny?.adminCompany,
    company: userAny?.company,
    finalDecision: isAdmin ? 'ADMIN PANEL' : 'EMPLOYEE DASHBOARD'
  });

  if (isAdmin) {
    return <AdminPanel />;
  }

  return <Dashboard />;
};

export default DashboardRouter;