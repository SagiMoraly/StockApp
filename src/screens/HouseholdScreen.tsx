import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { APIClient } from '../api/client';
import { withAPIRetry } from '../api/boot';
import { Household, HouseholdStatus } from '../api/types';
import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { SearchField } from '../components/SearchField';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { createHouseholdInviteURL, parseHouseholdInviteToken } from '../utils/household';

export type HouseholdScreenProps = {
  accessToken: string | null;
  onHouseholdChanged?: () => void;
  pendingInviteToken?: string | null;
  onInviteTokenConsumed?: () => void;
};

export function HouseholdScreen({ accessToken, onHouseholdChanged, pendingInviteToken, onInviteTokenConsumed }: HouseholdScreenProps) {
  const { colors, themeName } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors, themeName === 'dark'), [colors, themeName]);
  const [status, setStatus] = useState<HouseholdStatus | null>(null);
  const [inviteValue, setInviteValue] = useState('');
  const [loading, setLoading] = useState(Boolean(accessToken));
  const [applying, setApplying] = useState(false);
  const [creating, setCreating] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState(false);

  useEffect(() => {
    if (pendingInviteToken) {
      setInviteValue(pendingInviteToken);
      onInviteTokenConsumed?.();
    }
  }, [onInviteTokenConsumed, pendingInviteToken]);

  useEffect(() => {
    if (!accessToken) {
      setStatus(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void withAPIRetry(() => new APIClient().getHouseholdStatus(accessToken))
      .then((nextStatus) => {
        if (active) {
          setStatus(nextStatus);
        }
      })
      .catch((error) => {
        if (active) {
          Alert.alert(t('household.loadFailedTitle'), error instanceof Error ? error.message : t('household.loadFailedText'));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken, t]);

  const applyToHousehold = async () => {
    if (!accessToken) {
      Alert.alert(t('household.signInTitle'), t('household.signInText'));
      return;
    }

    const inviteToken = parseHouseholdInviteToken(inviteValue);
    if (!inviteToken) {
      Alert.alert(t('household.inviteRequiredTitle'), t('household.inviteRequiredText'));
      return;
    }

    setApplying(true);
    try {
      const nextStatus = await new APIClient().applyToHousehold(accessToken, inviteToken);
      setStatus(nextStatus);
      setInviteValue('');
    } catch (error) {
      Alert.alert(t('household.applyFailedTitle'), error instanceof Error ? error.message : t('household.applyFailedText'));
    } finally {
      setApplying(false);
    }
  };

  const refreshStatus = async () => {
    if (!accessToken) {
      return;
    }
    setStatus(await withAPIRetry(() => new APIClient().getHouseholdStatus(accessToken)));
    onHouseholdChanged?.();
  };

  const createHousehold = async () => {
    if (!accessToken || !householdName.trim()) {
      Alert.alert(t('household.nameRequiredTitle'), t('household.nameRequiredText'));
      return;
    }
    setCreating(true);
    try {
      const result = await new APIClient().createHousehold(accessToken, householdName.trim());
      setHouseholdName('');
      setInviteToken(result.inviteToken);
      await refreshStatus();
    } catch (error) {
      Alert.alert(t('household.createFailedTitle'), error instanceof Error ? error.message : t('household.createFailedText'));
    } finally {
      setCreating(false);
    }
  };

  const reviewApplication = async (applicationID: string, accepted: boolean, moveExistingData = true) => {
    if (!accessToken) {
      return;
    }
    try {
      const client = new APIClient();
      const nextStatus = accepted
        ? await client.acceptHouseholdApplication(accessToken, applicationID, moveExistingData)
        : await client.rejectHouseholdApplication(accessToken, applicationID);
      setStatus(nextStatus);
      onHouseholdChanged?.();
    } catch (error) {
      Alert.alert(t('household.applicationActionFailedTitle'), error instanceof Error ? error.message : t('household.applicationActionFailedText'));
    }
  };

  const acceptApplication = (applicationID: string) => {
    Alert.alert(t('household.dataChoiceTitle'), t('household.dataChoiceText'), [
      { text: t('household.discardData'), style: 'destructive', onPress: () => void reviewApplication(applicationID, true, false) },
      { text: t('household.moveData'), onPress: () => void reviewApplication(applicationID, true, true) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const completeLifecycleAction = async () => {
    if (!accessToken || !confirmAction) {
      return;
    }
    try {
      await new APIClient().leaveHousehold(accessToken);
      setConfirmAction(false);
      setInviteToken(null);
      await refreshStatus();
    } catch (error) {
      Alert.alert(t('household.lifecycleFailedTitle'), error instanceof Error ? error.message : t('household.lifecycleFailedText'));
    }
  };

  const shareInvite = async () => {
    if (!inviteToken) {
      return;
    }
    const extra = Constants.expoConfig?.extra as { shareLinkBaseUrl?: string } | undefined;
    const url = createHouseholdInviteURL(inviteToken, extra?.shareLinkBaseUrl);
    try {
      await Share.share({ message: url, url });
    } catch (error) {
      Alert.alert(t('household.inviteShareFailedTitle'), error instanceof Error ? error.message : t('household.inviteShareFailedText'));
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>{t('household.loading')}</Text>
      </View>
    );
  }

  if (status?.household) {
    return (
      <>
        <HouseholdOverview
          household={status.household}
          applications={status.applications}
          inviteToken={inviteToken}
          styles={styles}
          t={t}
          onAcceptApplication={acceptApplication}
          onRejectApplication={(applicationID) => void reviewApplication(applicationID, false)}
          onLeave={() => setConfirmAction(true)}
          onShareInvite={() => void shareInvite()}
        />
        <ConfirmActionModal
          visible={confirmAction}
          title={status.household.members.length === 1 ? t('household.disbandTitle') : t('household.leaveTitle')}
          message={status.household.members.length === 1 ? t('household.disbandText') : t('household.leaveText')}
          confirmLabel={status.household.members.length === 1 ? t('household.disbandButton') : t('household.leaveButton')}
          onCancel={() => setConfirmAction(false)}
          onConfirm={() => void completeLifecycleAction()}
        />
      </>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="people-outline" size={25} color={colors.accent} />
        </View>
        <Text style={styles.title}>{t('household.title')}</Text>
        <Text style={styles.subtitle}>{t('household.emptySubtitle')}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{t('household.findTitle')}</Text>
        <Text style={styles.panelText}>{t('household.findText')}</Text>
        <SearchField
          value={inviteValue}
          onChangeText={setInviteValue}
          placeholder={t('household.invitePlaceholder')}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={() => void applyToHousehold()} disabled={applying}>
          {applying ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
          <Text style={styles.primaryButtonText}>{t('household.applyButton')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{t('household.createTitle')}</Text>
        <Text style={styles.panelText}>{t('household.createText')}</Text>
        <SearchField value={householdName} onChangeText={setHouseholdName} placeholder={t('household.namePlaceholder')} />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void createHousehold()} disabled={creating}>
          {creating ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="add" size={18} color={colors.accent} />}
          <Text style={styles.secondaryButtonText}>{t('household.createButton')}</Text>
        </TouchableOpacity>
      </View>
      {status?.applications.map((application) => (
        <View key={application.id} style={styles.pendingPanel}>
          <Text style={styles.panelTitle}>{t('household.applicationPendingTitle')}</Text>
          <Text style={styles.panelText}>{t('household.applicationPendingText', { name: application.householdName })}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function HouseholdOverview({
  household,
  applications,
  inviteToken,
  styles,
  t,
  onAcceptApplication,
  onRejectApplication,
  onLeave,
  onShareInvite,
}: {
  household: Household;
  applications: HouseholdStatus['applications'];
  inviteToken: string | null;
  styles: ReturnType<typeof createStyles>;
  t: (key: string, params?: Record<string, string | number>) => string;
  onAcceptApplication: (applicationID: string) => void;
  onRejectApplication: (applicationID: string) => void;
  onLeave: () => void;
  onShareInvite: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="people" size={25} color={styles.iconColor.color} />
        </View>
        <Text style={styles.title}>{household.name}</Text>
        <Text style={styles.subtitle}>{t('household.connectedSubtitle')}</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('household.membersTitle')}</Text>
        <Text style={styles.count}>{household.members.length}</Text>
      </View>
      <View style={styles.memberList}>
        {household.members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(member.displayName ?? '?').charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.memberName}>{member.displayName ?? t('household.unknownMember')}</Text>
            <Ionicons name="checkmark-circle" size={20} color={styles.iconColor.color} />
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('household.applicationsTitle')}</Text>
      </View>
      {applications.length ? applications.map((application) => (
        <View key={application.id} style={styles.applicationPanel}>
          <Text style={styles.panelTitle}>{application.applicantName ?? t('household.unknownMember')}</Text>
          <Text style={styles.panelText}>{t('household.applicationReceivedText')}</Text>
          <View style={styles.applicationActions}>
            <TouchableOpacity style={styles.rejectButton} onPress={() => onRejectApplication(application.id)}>
              <Text style={styles.rejectButtonText}>{t('household.rejectButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => onAcceptApplication(application.id)}>
              <Text style={styles.primaryButtonText}>{t('household.acceptButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )) : (
        <View style={styles.emptyPanel}>
          <Ionicons name="mail-open-outline" size={24} color={styles.iconColor.color} />
          <Text style={styles.emptyTitle}>{t('household.noApplicationsTitle')}</Text>
          <Text style={styles.emptyText}>{t('household.noApplicationsText')}</Text>
        </View>
      )}
      {inviteToken ? (
        <View style={styles.invitePanel}>
          <Text style={styles.panelTitle}>{t('household.inviteReadyTitle')}</Text>
          <Text style={styles.panelText}>{inviteToken}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={onShareInvite}>
            <Ionicons name="share-outline" size={16} color={styles.iconColor.color} />
            <Text style={styles.secondaryButtonText}>{t('household.shareInviteButton')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.lifecycleActions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onLeave}>
          <Text style={styles.secondaryButtonText}>
            {household.members.length === 1 ? t('household.disbandButton') : t('household.leaveButton')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 30,
      paddingBottom: 118,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    header: {
      alignItems: 'center',
      marginBottom: 28,
    },
    iconCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
      marginBottom: 14,
    },
    iconColor: {
      color: colors.accent,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      marginTop: 7,
      maxWidth: 310,
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      padding: 18,
    },
    panelTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    panelText: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 7,
      marginBottom: 16,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 10,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      marginTop: 12,
      minHeight: 48,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    secondaryButton: {
      alignItems: 'center',
      borderColor: colors.accent,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      marginTop: 12,
      minHeight: 48,
    },
    secondaryButtonText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '800',
    },
    pendingPanel: {
      backgroundColor: colors.warningSoft,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      marginTop: 16,
      padding: 18,
    },
    applicationPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 12,
      padding: 18,
    },
    applicationActions: {
      flexDirection: 'row',
      gap: 10,
    },
    rejectButton: {
      alignItems: 'center',
      borderColor: colors.danger,
      borderRadius: 10,
      borderWidth: 1,
      flex: 1,
      justifyContent: 'center',
      minHeight: 44,
    },
    rejectButtonText: {
      color: colors.danger,
      fontWeight: '800',
    },
    invitePanel: {
      backgroundColor: colors.successSoft,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      marginTop: 16,
      padding: 18,
    },
    lifecycleActions: {
      gap: 10,
      marginTop: 22,
    },
    dangerButton: {
      alignItems: 'center',
      borderColor: colors.danger,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 48,
    },
    dangerButtonText: {
      color: colors.danger,
      fontWeight: '800',
    },
    sectionHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
      marginTop: 4,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    count: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '800',
    },
    memberList: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 26,
      overflow: 'hidden',
    },
    memberRow: {
      alignItems: 'center',
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: 12,
      minHeight: 66,
      paddingHorizontal: 15,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderRadius: 19,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
    avatarText: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: '800',
    },
    memberName: {
      color: colors.text,
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
    },
    emptyPanel: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      padding: 24,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 10,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6,
      textAlign: 'center',
    },
  });
