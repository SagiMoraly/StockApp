import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';
import { TabKey } from '../types';

type BottomNavProps = {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
};

const tabs: Array<{ key: TabKey; labelKey: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'home', labelKey: 'tabs.home', icon: 'home-outline' },
  { key: 'recipes', labelKey: 'tabs.recipes', icon: 'book-outline' },
  { key: 'list', labelKey: 'tabs.list', icon: 'list-outline' },
  { key: 'items', labelKey: 'tabs.items', icon: 'basket-outline' },
  { key: 'household', labelKey: 'tabs.household', icon: 'people-outline' },
];

export function BottomNav({ activeTab, onTabPress }: BottomNavProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);

  return (
    <View style={styles.bottomBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tabItem, tab.key === 'list' && styles.listTabItem]}
          onPress={() => onTabPress(tab.key)}
        >
          <Ionicons
            name={tab.icon}
            size={20}
            color={tab.key === 'list' ? '#FFFFFF' : activeTab === tab.key ? colors.accent : colors.mutedIcon}
          />
          <Text style={[styles.tabLabel, tab.key === 'list' && styles.listTabLabel, activeTab === tab.key && styles.activeTabLabel]}>
            {t(tab.labelKey)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isRTL: boolean) =>
  StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.bottomBar,
    borderWidth: 1,
    borderColor: colors.bottomBarBorder,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  listTabItem: {
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    marginTop: -22,
    width: 64,
  },
  tabLabel: {
    fontSize: 11,
    color: colors.mutedIcon,
    fontWeight: '600',
  },
  activeTabLabel: {
    color: colors.accent,
  },
  listTabLabel: {
    color: '#FFFFFF',
  },
});
