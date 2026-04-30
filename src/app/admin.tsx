import { ShieldCheck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Protected } from '@/components/protected';
import { AppShell, Card, Chip, LoadingState, PageHeader, SectionTitle, Button } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data';
import { useAuth } from '@/context/auth';
import { UserProfile, UserRole } from '@/types/domain';

const roles: UserRole[] = ['user', 'dietitian', 'admin'];

export default function AdminScreen() {
  return (
    <Protected>
      <AdminContent />
    </Protected>
  );
}

function AdminContent() {
  const { profile, allUsers, loading, setUserRole, assignClientToDietitian, deleteUserAccount } = useAppData();
  const { resetPassword } = useAuth();
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const dietitians = useMemo(() => allUsers.filter((item) => item.role === 'dietitian'), [allUsers]);

  if (loading || !profile) return <LoadingState />;

  if (profile.role !== 'admin') {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Admin workspace"
          title="Admin access required"
          subtitle="This page is only available to admin accounts."
        />
        <Card tone="low">
          <Text style={styles.cardTitle}>You are not an admin</Text>
          <Text style={styles.cardCopy}>Ask an existing admin to promote your account, or run scripts/promote-admin.ts once.</Text>
        </Card>
      </AppShell>
    );
  }

  const handleRoleChange = async (target: UserProfile, nextRole: UserRole) => {
    if (target.role === nextRole) return;
    setBusyUid(target.id);
    try {
      await setUserRole(target.id, nextRole);
    } catch (error) {
      Alert.alert('Could not update role', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      setBusyUid(null);
    }
  };

  const handleAssignDietitian = async (client: UserProfile, nextDietitianUid: string | null) => {
    if ((client.dietitianId ?? null) === nextDietitianUid) return;
    setBusyUid(client.id);
    try {
      await assignClientToDietitian(client.id, nextDietitianUid);
    } catch (error) {
      Alert.alert('Could not assign dietitian', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      setBusyUid(null);
    }
  };

  const handleSendPasswordReset = async (target: UserProfile) => {
    setBusyUid(target.id);
    try {
      await resetPassword(target.email);
      Alert.alert('Password reset sent', `An email has been sent to ${target.email} with instructions.`);
    } catch (error) {
      Alert.alert('Failed to send reset email', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      setBusyUid(null);
    }
  };

  const handleDeleteUser = async (target: UserProfile) => {
    const message = `Are you sure you want to permanently delete ${target.name} (${target.email})? This action cannot be undone.`;

    const executeDelete = async () => {
      setBusyUid(target.id);
      try {
        await deleteUserAccount(target.id);
      } catch (error) {
        Alert.alert('Could not delete account', error instanceof Error ? error.message : 'Try again in a moment.');
      } finally {
        setBusyUid(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        await executeDelete();
      }
    } else {
      Alert.alert(
        'Delete Account',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };

  const summary = {
    users: allUsers.filter((item) => item.role === 'user').length,
    dietitians: dietitians.length,
    admins: allUsers.filter((item) => item.role === 'admin').length,
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin workspace"
        title="People & roles"
        subtitle="Promote dietitians, assign clients, and manage admin access from one place."
      />

      <View style={styles.summaryGrid}>
        <Card tone="soft" style={styles.summaryCard}>
          <ShieldCheck size={28} color={colors.primary} />
          <Text style={styles.summaryValue}>{allUsers.length}</Text>
          <Text style={styles.cardCopy}>Total accounts</Text>
        </Card>
        <Card tone="soft" style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.users}</Text>
          <Text style={styles.cardCopy}>Users</Text>
        </Card>
        <Card tone="soft" style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.dietitians}</Text>
          <Text style={styles.cardCopy}>Dietitians</Text>
        </Card>
        <Card tone="soft" style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.admins}</Text>
          <Text style={styles.cardCopy}>Admins</Text>
        </Card>
      </View>

      <SectionTitle title="All accounts" />
      <View style={styles.userGrid}>
        {allUsers.map((target) => {
          const isSelf = target.id === profile.id;
          const dietitianName = target.dietitianId
            ? allUsers.find((item) => item.id === target.dietitianId)?.name ?? 'Unknown'
            : null;
          return (
            <Card key={target.id} style={styles.userCard}>
              <View style={styles.userTop}>
                <View style={styles.userCopy}>
                  <Text style={styles.cardTitle}>
                    {target.name}
                    {isSelf ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.cardCopy}>{target.email}</Text>
                </View>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{target.role}</Text>
                </View>
              </View>

              <View style={styles.subsection}>
                <Text style={styles.subsectionLabel}>Role</Text>
                <View style={styles.chipRow}>
                  {roles.map((role) => (
                    <Chip
                      key={role}
                      label={role}
                      active={target.role === role}
                      onPress={isSelf || busyUid === target.id ? undefined : () => handleRoleChange(target, role)}
                    />
                  ))}
                </View>
                {isSelf ? <Text style={styles.metaText}>You cannot change your own role.</Text> : null}
              </View>

              {target.role === 'user' ? (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionLabel}>
                    Assigned dietitian{dietitianName ? `: ${dietitianName}` : ''}
                  </Text>
                  <View style={styles.chipRow}>
                    <Chip
                      label="None"
                      active={!target.dietitianId}
                      onPress={busyUid === target.id ? undefined : () => handleAssignDietitian(target, null)}
                    />
                    {dietitians.map((dietitian) => (
                      <Chip
                        key={dietitian.id}
                        label={dietitian.name || dietitian.email}
                        active={target.dietitianId === dietitian.id}
                        onPress={
                          busyUid === target.id ? undefined : () => handleAssignDietitian(target, dietitian.id)
                        }
                      />
                    ))}
                  </View>
                  {!dietitians.length ? (
                    <Text style={styles.metaText}>No dietitians yet. Promote a user above first.</Text>
                  ) : null}
                </View>
              ) : null}

              {target.role === 'dietitian' ? (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionLabel}>Clients ({target.clientIds?.length ?? 0})</Text>
                  <Text style={styles.cardCopy}>
                    {target.clientIds?.length
                      ? target.clientIds
                        .map((cid) => allUsers.find((item) => item.id === cid)?.name ?? cid)
                        .join(', ')
                      : 'No clients assigned yet.'}
                  </Text>
                </View>
              ) : null}

              <View style={styles.subsection}>
                <Text style={styles.subsectionLabel}>Actions</Text>
                <View style={styles.chipRow}>
                  <Chip
                    label="Send Password Reset"
                    onPress={busyUid === target.id ? undefined : () => handleSendPasswordReset(target)}
                  />
                  {!isSelf && (
                    <Chip
                      label="Delete Account"
                      onPress={busyUid === target.id ? undefined : () => handleDeleteUser(target)}
                    />
                  )}
                </View>
              </View>

              {busyUid === target.id ? (
                <Pressable disabled style={styles.busyTag}>
                  <Text style={styles.busyText}>Saving...</Text>
                </Pressable>
              ) : null}
            </Card>
          );
        })}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCard: {
    minWidth: 180,
    flex: 1,
    gap: spacing.sm,
  },
  summaryValue: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
    fontSize: 36,
  },
  userGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  userCard: {
    flex: 1,
    minWidth: 320,
    gap: spacing.md,
  },
  userTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  userCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 18,
  },
  cardCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    lineHeight: 21,
  },
  rolePill: {
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  rolePillText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  subsection: {
    gap: spacing.xs,
  },
  subsectionLabel: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaText: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  busyTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  busyText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
});
