import { useMemo } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius, ThemePreference } from '../theme';

type ThemeSettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

const themeOptions: ThemePreference[] = ['system', 'light', 'dark'];

export function ThemeSettingsModal({ visible, onClose }: ThemeSettingsModalProps) {
  const { colors, themePreference, setThemePreference } = useTheme();
  const { language, setLanguage, t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(isRTL), [isRTL]);

  const languageOptions = [
    { value: 'en' as const, label: t('language.english') },
    { value: 'he' as const, label: t('language.hebrew') },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}> 
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.title, { color: colors.text }]}>{t('settings.appearanceTitle')}</Text>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {t('settings.themeTitle')}
          </Text>

          {themeOptions.map((option) => {
            const selected = option === themePreference;
            const optionLabel = t(`theme.${option}`);
            const optionDescription = t(`theme.${option}Description`);

            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? colors.accent : colors.border,
                    backgroundColor: selected ? colors.accentSoft : colors.surfaceMuted,
                  },
                ]}
                onPress={() => setThemePreference(option)}
                activeOpacity={0.9}
              >
                <View>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>{optionLabel}</Text>
                  <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                    {optionDescription}
                  </Text>
                </View>
                <View
                  style={[
                    styles.indicator,
                    {
                      borderColor: selected ? colors.accent : colors.borderSoft,
                      backgroundColor: selected ? colors.accent : 'transparent',
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {t('settings.languageTitle')}
          </Text>

          <View style={styles.languageRow}>
            {languageOptions.map((option) => {
              const selected = option.value === language;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.languageChip,
                    {
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? colors.accentSoft : colors.surfaceMuted,
                    },
                  ]}
                  onPress={() => {
                    void setLanguage(option.value).then(({ restartRequired }) => {
                      if (restartRequired) {
                        Alert.alert(t('settings.restartRequiredTitle'), t('settings.restartRequiredMessage'));
                      }
                    });
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.languageChipText, { color: selected ? colors.accent : colors.text }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.accent }]}
            onPress={onClose}
            activeOpacity={0.92}
          >
            <Text style={[styles.closeButtonText, { color: colors.white }]}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (isRTL: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: isRTL ? 'right' : 'left',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 2,
    textAlign: isRTL ? 'right' : 'left',
  },
  option: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: isRTL ? 'right' : 'left',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
    textAlign: isRTL ? 'right' : 'left',
  },
  indicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  languageRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 8,
    marginTop: 2,
  },
  languageChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  languageChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    marginTop: 6,
    borderRadius: radius.sm,
    paddingVertical: 13,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
