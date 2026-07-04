import { AppShell } from './src/AppShell';
import { LocalizationProvider } from './src/LocalizationProvider';
import { ThemeProvider } from './src/ThemeProvider';

export default function App() {
  return (
    <LocalizationProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </LocalizationProvider>
  );
}
