import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { useAuth } from './AuthProvider';

export function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { signInWithGoogle, continueOffline } = useAuth();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.logo, { color: colors.accent }]}>StockUp</Text>
        <Text style={[styles.title, { color: colors.heading }]}>{t('auth.title')}</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>{t('auth.description')}</Text>
        <TouchableOpacity style={[styles.googleButton, { backgroundColor: colors.accent }]} onPress={signInWithGoogle}>
          <Text style={[styles.buttonText, { color: colors.white }]}>{t('auth.google')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.offlineButton, { borderColor: colors.border }]} onPress={continueOffline}>
          <Text style={[styles.offlineText, { color: colors.text }]}>{t('auth.offline')}</Text>
        </TouchableOpacity>
        <Text style={[styles.note, { color: colors.textMuted }]}>{t('auth.note')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { borderWidth: 1, borderRadius: 24, padding: 24, gap: 16 },
  logo: { fontSize: 34, fontWeight: '800', textAlign: 'center' },
  title: { fontSize: 25, fontWeight: '800', textAlign: 'center' },
  description: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  googleButton: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  offlineButton: { borderWidth: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '800' },
  offlineText: { fontSize: 16, fontWeight: '700' },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
