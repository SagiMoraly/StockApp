import { AppShell } from './src/AppShell';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { LoginScreen } from './src/auth/LoginScreen';
import { APIBootScreen } from './src/components/APIBootScreen';
import { LocalizationProvider } from './src/LocalizationProvider';
import { ThemeProvider } from './src/ThemeProvider';

export default function App() {
  return (
    <LocalizationProvider>
      <ThemeProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </ThemeProvider>
    </LocalizationProvider>
  );
}

function AuthenticatedApp() {
  const { mode } = useAuth();

  if (mode === 'loading') {
    return <APIBootScreen />;
  }

  return mode === 'offline' || mode === 'google' ? <AppShell /> : <LoginScreen />;
}
