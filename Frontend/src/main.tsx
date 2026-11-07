import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import LoginPage from './Login/LoginPage.tsx';
import LandingPage from './LandingPage/LandingPage.tsx';
import SuperAdminDashboard from './SuperAdmin/SuperAdminDashboard.tsx';
import ChecklistModule from './checklist/ChecklistModule.tsx';
import DwmDashboard from './dwm/DwmDashboard.tsx';
import MpsModule from './mps/MpsModule.tsx';
import { isAuthenticated, AuthUser, getUser, saveUser } from './shared/utils/auth.ts';
import { hasModuleAccess } from './shared/utils/rbac.ts';
import AccessDeniedModal from './shared/components/AccessDeniedModal.tsx';
import './index.css';

function Root() {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => isAuthenticated());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getUser());
    const [currentView, setCurrentView] = useState<'landing' | 'sfc' | 'dwm' | 'checklist' | 'mps' | 'superadmin'>(() => {
      const user = getUser();
      if (user?.is_superadmin || user?.role_category === 'superadmin') {
        return 'superadmin';
      }
      return 'landing';
    });

    // Session timeout watcher — check every 60 seconds
    useEffect(() => {
      if (!loggedIn) return;
      const interval = setInterval(() => {
        if (!isAuthenticated()) {
          setLoggedIn(false);
          setCurrentUser(null);
          setCurrentView('landing');
        }
      }, 60_000);
      return () => clearInterval(interval);
    }, [loggedIn]);

    const handleLoginSuccess = (user: AuthUser) => {
      saveUser(user);
      setCurrentUser(user);
      setLoggedIn(true);
      if (user.is_superadmin || user.role_category === 'superadmin') {
        setCurrentView('superadmin');
      } else {
        setCurrentView('landing');
      }
    };

    const handleSessionEnd = () => {
      setLoggedIn(false);
      setCurrentUser(null);
      setCurrentView('landing');
    };

    if (!loggedIn) {
      return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }

    if (currentView === 'superadmin') {
      return (
        <SuperAdminDashboard
          currentUser={currentUser}
          onLogout={handleSessionEnd}
          onNavigateToCockpit={() => setCurrentView('landing')}
          onNavigateToSfc={() => setCurrentView('sfc')}
          onNavigateToMps={() => setCurrentView('mps')}
          onNavigateToChecklist={() => setCurrentView('checklist')}
        />
      );
    }

    if (currentView === 'landing') {
      return (
        <LandingPage
          currentUser={currentUser}
          onLaunchSFC={() => setCurrentView('sfc')}
          onLaunchDWM={() => setCurrentView('dwm')}
          onLaunchMPS={() => setCurrentView('mps')}
          onLogout={handleSessionEnd}
          onNavigateToSuperadmin={() => setCurrentView('superadmin')}
        />
      );
    }

    if (currentView === 'dwm') {
      const isSuperadmin = Boolean(currentUser?.is_superadmin || currentUser?.role_category === 'superadmin');
      if (!isSuperadmin && !hasModuleAccess(currentUser, 'checklist')) {
        return (
          <AccessDeniedModal
            isOpen={true}
            moduleName="Daily Work Management (DWM)"
            onClose={() => setCurrentView('landing')}
            onBackToDashboard={() => setCurrentView('landing')}
          />
        );
      }
      return (
        <DwmDashboard
          currentUser={currentUser}
          onBackToLanding={() => setCurrentView('landing')}
          onLaunchChecklist={() => setCurrentView('checklist')}
          onLogout={handleSessionEnd}
          onNavigateToSuperadmin={() => setCurrentView('superadmin')}
        />
      );
    }

    if (currentView === 'checklist') {
      if (!hasModuleAccess(currentUser, 'checklist')) {
        return (
          <AccessDeniedModal
            isOpen={true}
            moduleName="Daily Work Management (Checklist)"
            onClose={() => setCurrentView('landing')}
            onBackToDashboard={() => setCurrentView('landing')}
          />
        );
      }
      return (
        <ChecklistModule
          currentUser={currentUser}
          onBackToLanding={() => setCurrentView('dwm')}
          onLogout={handleSessionEnd}
          onNavigateToSuperadmin={() => setCurrentView('superadmin')}
        />
      );
    }

    if (currentView === 'mps') {
      if (!hasModuleAccess(currentUser, 'mps')) {
        return (
          <AccessDeniedModal
            isOpen={true}
            moduleName="Weekly MRP & Supply Operations (MPS)"
            onClose={() => setCurrentView('landing')}
            onBackToDashboard={() => setCurrentView('landing')}
          />
        );
      }
      return (
        <MpsModule
          currentUser={currentUser}
          onBackToLanding={() => setCurrentView('landing')}
          onLogout={handleSessionEnd}
          onNavigateToSuperadmin={() => setCurrentView('superadmin')}
        />
      );
    }

    return (
      <App
        loggedInUser={currentUser}
        onLogout={handleSessionEnd}
        onBackToLanding={() => setCurrentView('landing')}
        onNavigateToSuperadmin={() => setCurrentView('superadmin')}
      />
    );
  }

createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
