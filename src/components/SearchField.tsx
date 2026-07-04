import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

export function SearchField({ value, onChangeText, placeholder }: SearchFieldProps) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);

  return (
    <View style={styles.searchWrap}>
      <Ionicons name="search-outline" size={18} color={colors.searchIcon} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder}
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isRTL: boolean) =>
  StyleSheet.create({
  searchWrap: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 13,
    paddingHorizontal: 12,
    height: 46,
    alignItems: 'center',
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.inputText,
    textAlign: isRTL ? 'right' : 'left',
  },
});
