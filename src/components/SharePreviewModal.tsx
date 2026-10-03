import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { APIClient } from '../api/client';
import { withAPIRetry } from '../api/boot';
import { AcceptedShare, SharePreview } from '../api/types';
import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';

type SharePreviewModalProps = {
  token: string | null;
  accessToken: string | null;
  onClose: () => void;
  onAccepted: (share: AcceptedShare) => void;
  onSignIn: () => void;
};

export function SharePreviewModal({ token, accessToken, onClose, onAccepted, onSignIn }: SharePreviewModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [preview, setPreview] = useState<SharePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token || !accessToken) {
      setPreview(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void withAPIRetry(() => new APIClient().previewShare(accessToken, token))
      .then((nextPreview) => {
        if (active) {
          setPreview(nextPreview);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : t('share.previewError'));
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
  }, [accessToken, t, token]);

  const accept = async () => {
    if (!token || !accessToken || !preview || preview.expired) {
      return;
    }

    setAccepting(true);
    setError(null);
    try {
      const accepted = await new APIClient().acceptShare(accessToken, token);
      onAccepted(accepted);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('share.acceptFailed'));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Modal visible={token !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.panel}>
          <Text style={styles.title}>{t('share.previewTitle')}</Text>
          {!accessToken ? (
            <>
              <Text style={styles.message}>{t('share.signInRequired')}</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={onSignIn}>
                <Text style={styles.primaryButtonText}>{t('auth.google')}</Text>
              </TouchableOpacity>
            </>
          ) : loading ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.message}>{t('share.loading')}</Text>
            </View>
          ) : (
            <>
              {preview ? <Text style={styles.resourceTitle}>{preview.title}</Text> : null}
              {preview?.expired ? <Text style={styles.error}>{t('share.expired')}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
                  <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, (!preview || preview.expired || accepting) && styles.disabledButton]}
                  onPress={() => void accept()}
                  disabled={!preview || preview.expired || accepting}
                >
                  <Text style={styles.primaryButtonText}>{accepting ? t('share.accepting') : t('share.accept')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.overlay,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.title,
    fontSize: 20,
    fontWeight: '800',
  },
  resourceTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  primaryButton: {
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  disabledButton: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
});