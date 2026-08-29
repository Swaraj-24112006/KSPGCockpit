import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import LoginPage from './Login/LoginPage.tsx';
import LandingPage from './LandingPage/LandingPage.tsx';
import SuperAdminDashboard from './SuperAdmin/SuperAdminDashboard.tsx';
import { isAuthenticated, AuthUser, getUser, saveUser } from './shared/utils/auth.ts';
import './index.css';

function Root() {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => isAuthenticated());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getUser());
  const [currentView, setCurrentView] = useState<'landing' | 'sfc' | 'superadmin'>(() => {
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
      />
    );
  }

  if (currentView === 'landing') {
    return (
      <LandingPage 
        currentUser={currentUser} 
        onLaunchSFC={() => setCurrentView('sfc')} 
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

