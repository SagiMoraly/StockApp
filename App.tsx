import { AppShell } from './src/AppShell';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { LoginScreen } from './src/auth/LoginScreen';
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
    return null;
  }

  return mode === 'offline' || mode === 'google' ? <AppShell /> : <LoginScreen />;
}
