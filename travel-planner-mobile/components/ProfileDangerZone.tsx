import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { userApi } from '@/api/user';
import { cancelAllReminders } from '@/utils/notifications';
import { clearAllNotifications } from '@/utils/notificationStore';
import { clearTokens } from '@/utils/auth';
import { getErrorMessage } from '@/utils/errorHandler';
import { theme } from '@/constants/theme';

export function ProfileDangerZone() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const onDeleteAccount = useCallback(() => {
    Alert.alert('Delete account', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await userApi.deleteAccount();
            await cancelAllReminders();
            await clearAllNotifications();
            await clearTokens();
            router.replace('/login');
          } catch (e: unknown) {
            Alert.alert('Could not delete account', getErrorMessage(e));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [router]);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionEyebrow}>Account</Text>
      <Text style={styles.sectionTitle}>Danger zone</Text>
      <View style={styles.sectionDivider} />

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDeleteAccount}
        disabled={deleting}
        activeOpacity={0.85}
      >
        {deleting ? (
          <ActivityIndicator color={theme.colors.text} />
        ) : (
          <Text style={styles.deleteBtnText}>Delete account</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionEyebrow: {
    fontSize: 10,
    color: theme.colors.subtext,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginTop: 12,
    marginBottom: 16,
  },
  deleteBtn: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: theme.colors.error,
    fontWeight: '700',
    fontSize: 16,
  },
});
