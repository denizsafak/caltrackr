import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { signOut } from '@/services/firebase/auth';
import { updateUserProfile } from '@/services/firebase/firestore';
import { useAuthStore } from '@/stores/auth';
import { usePlannerStore } from '@/stores/planner';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { DietaryPreference, Allergen } from '@/types';

const DIETARY_OPTIONS: { key: DietaryPreference; label: string; description: string; icon: string }[] = [
  { key: 'vegetarian', label: 'Vegetarian', description: 'Exclude meat, keep dairy & eggs', icon: '🥗' },
  { key: 'vegan', label: 'Vegan', description: 'All plant-based', icon: '🌱' },
  { key: 'keto', label: 'Keto', description: 'High fat, low carb', icon: '🥩' },
  { key: 'gluten_free', label: 'Gluten Free', description: 'Exclude gluten sources', icon: '🌾' },
  { key: 'dairy_free', label: 'Dairy Free', description: 'Exclude dairy products', icon: '🥛' },
  { key: 'intermittent_fasting', label: 'Fasting Window', description: 'Enable fasting tracking', icon: '⏱️' },
];

const ALLERGEN_OPTIONS: { key: Allergen; label: string; icon: string }[] = [
  { key: 'nuts', label: 'Tree Nuts & Peanuts', icon: '⚠️' },
  { key: 'gluten', label: 'Gluten', icon: '🌾' },
  { key: 'dairy', label: 'Dairy', icon: '🥛' },
  { key: 'eggs', label: 'Eggs', icon: '🥚' },
  { key: 'soy', label: 'Soy', icon: '🫘' },
  { key: 'shellfish', label: 'Shellfish', icon: '🦞' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateProfile } = useAuthStore();
  const { savedPlans } = usePlannerStore();

  const [calorieModalVisible, setCalorieModalVisible] = useState(false);
  const [newCalorieGoal, setNewCalorieGoal] = useState(String(user?.dailyCalorieGoal ?? 2000));
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const templates = savedPlans.filter((p) => p.isTemplate);

  const toggleDiet = async (key: DietaryPreference) => {
    const current = user.dietaryPreferences;
    const updated = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    updateProfile({ dietaryPreferences: updated });
    await updateUserProfile(user.uid, { dietaryPreferences: updated });
  };

  const toggleAllergen = async (key: Allergen) => {
    const current = user.allergens;
    const updated = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    updateProfile({ allergens: updated });
    await updateUserProfile(user.uid, { allergens: updated });
  };

  const saveCalorieGoal = async () => {
    const goal = parseInt(newCalorieGoal);
    if (!goal || goal < 800 || goal > 10000) {
      Alert.alert('Invalid Goal', 'Please enter a value between 800 and 10,000 kcal.');
      return;
    }
    setSaving(true);
    const protein = Math.round((goal * 0.30) / 4);
    const carbs = Math.round((goal * 0.40) / 4);
    const fat = Math.round((goal * 0.30) / 9);
    await updateUserProfile(user.uid, {
      dailyCalorieGoal: goal,
      macroGoals: { protein, carbs, fat },
    });
    updateProfile({ dailyCalorieGoal: goal, macroGoals: { protein, carbs, fat } });
    setSaving(false);
    setCalorieModalVisible(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.overviewLabel}>PERSONAL OVERVIEW</Text>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
        <View style={styles.avatarContainer}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Calorie Goal Card */}
      <Card style={styles.calorieCard} variant="elevated">
        <View style={styles.calorieCardHeader}>
          <View>
            <Text style={styles.calorieCardTitle}>Daily Calorie Goal</Text>
            <Text style={styles.calorieCardSubtitle}>Target intake for maintenance</Text>
          </View>
          <Ionicons name="flash" size={20} color={Colors.primary} />
        </View>
        <Text style={styles.calorieValue}>{user.dailyCalorieGoal.toLocaleString()}</Text>
        <Text style={styles.calorieUnit}>kcal</Text>

        <View style={styles.macroStrip}>
          <MacroChip label="Protein" value={`${user.macroGoals.protein}g`} color={Colors.primary} />
          <MacroChip label="Carbs" value={`${user.macroGoals.carbs}g`} color={Colors.secondaryContainer} />
          <MacroChip label="Fat" value={`${user.macroGoals.fat}g`} color={Colors.tertiary} />
        </View>

        <TouchableOpacity style={styles.adjustGoalBtn} onPress={() => setCalorieModalVisible(true)}>
          <Text style={styles.adjustGoalText}>Adjust Goal</Text>
          <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
        </TouchableOpacity>
      </Card>

      {/* Dietary Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dietary Preferences</Text>
        <Text style={styles.sectionSubtitle}>Customize your experience to match your lifestyle.</Text>
        <View style={styles.preferenceList}>
          {DIETARY_OPTIONS.map((opt) => (
            <View key={opt.key} style={styles.preferenceRow}>
              <Text style={styles.prefIcon}>{opt.icon}</Text>
              <View style={styles.prefText}>
                <Text style={styles.prefLabel}>{opt.label}</Text>
                <Text style={styles.prefDesc}>{opt.description}</Text>
              </View>
              <Switch
                value={user.dietaryPreferences.includes(opt.key)}
                onValueChange={() => toggleDiet(opt.key)}
                trackColor={{ false: Colors.surfaceHigh, true: Colors.secondaryContainer }}
                thumbColor={user.dietaryPreferences.includes(opt.key) ? Colors.primary : Colors.outlineVariant}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Allergens */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Allergen Alerts</Text>
        <Text style={styles.sectionSubtitle}>Flag ingredients containing these allergens.</Text>
        <View style={styles.preferenceList}>
          {ALLERGEN_OPTIONS.map((opt) => (
            <View key={opt.key} style={styles.preferenceRow}>
              <Text style={styles.prefIcon}>{opt.icon}</Text>
              <View style={styles.prefText}>
                <Text style={styles.prefLabel}>{opt.label}</Text>
              </View>
              <Switch
                value={user.allergens.includes(opt.key)}
                onValueChange={() => toggleAllergen(opt.key)}
                trackColor={{ false: Colors.surfaceHigh, true: Colors.tertiaryContainer + '80' }}
                thumbColor={user.allergens.includes(opt.key) ? Colors.tertiary : Colors.outlineVariant}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Saved Plans */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Plans</Text>
        <Text style={styles.sectionSubtitle}>Your curated meal templates and cycles.</Text>
        {templates.length === 0 ? (
          <TouchableOpacity style={styles.newTemplateBtn} onPress={() => router.push('/(tabs)/planner')}>
            <Ionicons name="add" size={18} color={Colors.onSurfaceVariant} />
            <Text style={styles.newTemplateBtnText}>Create New Template</Text>
          </TouchableOpacity>
        ) : (
          <>
            {templates.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={styles.templateCard}
                onPress={() => router.push('/(tabs)/planner')}
              >
                <View style={styles.templateIcon}>
                  <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>{plan.templateName}</Text>
                  <Text style={styles.templateMeta}>{plan.dailyTarget.toLocaleString()} kcal/day</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.outlineVariant} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.newTemplateBtn} onPress={() => router.push('/(tabs)/planner')}>
              <Ionicons name="add" size={18} color={Colors.onSurfaceVariant} />
              <Text style={styles.newTemplateBtnText}>Create New Template</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Sign Out */}
      <View style={[styles.section, { marginBottom: Spacing.xxl }]}>
        <Button label="Sign Out" variant="danger" onPress={handleSignOut} fullWidth />
      </View>

      <View style={{ height: 60 }} />

      {/* Calorie Goal Modal */}
      <Modal visible={calorieModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setCalorieModalVisible(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Adjust Calorie Goal</Text>
            <Text style={styles.modalSubtitle}>Set your daily calorie target in kcal.</Text>
            <TextInput
              style={styles.modalInput}
              value={newCalorieGoal}
              onChangeText={setNewCalorieGoal}
              keyboardType="number-pad"
              selectTextOnFocus
              placeholder="e.g. 2000"
              placeholderTextColor={Colors.outlineVariant}
            />
            <Text style={styles.modalHint}>Macros will be recalculated (30% P / 40% C / 30% F)</Text>
            <View style={styles.modalActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setCalorieModalVisible(false)} />
              <Button label="Save" onPress={saveCalorieGoal} loading={saving} />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function MacroChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[macroStyles.chip, { borderColor: color + '40' }]}>
      <Text style={macroStyles.value}>{value}</Text>
      <Text style={macroStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  headerText: { flex: 1 },
  overviewLabel: { ...Typography.labelMd, color: Colors.onSurfaceVariant, letterSpacing: 1 },
  userName: { fontSize: 36, fontFamily: 'Inter_700Bold', color: Colors.onSurface, letterSpacing: -1, marginTop: 4 },
  userEmail: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginTop: 4 },
  avatarContainer: { marginLeft: Spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: Radius.full },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 32, fontFamily: 'Inter_700Bold', color: Colors.secondary },
  calorieCard: { marginHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  calorieCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  calorieCardTitle: { ...Typography.titleMd, color: Colors.onSurface },
  calorieCardSubtitle: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
  calorieValue: { fontSize: 52, fontFamily: 'Inter_700Bold', color: Colors.primary, letterSpacing: -2 },
  calorieUnit: { ...Typography.labelLg, color: Colors.onSurfaceVariant, marginBottom: Spacing.md },
  macroStrip: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  adjustGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceHigh,
    paddingTop: Spacing.md,
    width: '100%',
  },
  adjustGoalText: { ...Typography.labelLg, color: Colors.primary },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionTitle: { ...Typography.headlineSm, color: Colors.onSurface, marginBottom: 4 },
  sectionSubtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginBottom: Spacing.lg, lineHeight: 22 },
  preferenceList: { gap: Spacing.sm },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.card,
  },
  prefIcon: { fontSize: 20 },
  prefText: { flex: 1 },
  prefLabel: { ...Typography.titleSm, color: Colors.onSurface },
  prefDesc: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadow.card,
  },
  templateIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateInfo: { flex: 1 },
  templateName: { ...Typography.titleSm, color: Colors.onSurface },
  templateMeta: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
  newTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  newTemplateBtnText: { ...Typography.labelLg, color: Colors.onSurfaceVariant },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  modalCard: { backgroundColor: Colors.surfaceLowest, borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', ...Shadow.modal },
  modalTitle: { ...Typography.headlineSm, color: Colors.onSurface, marginBottom: Spacing.xs },
  modalSubtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginBottom: Spacing.lg },
  modalInput: {
    backgroundColor: Colors.surfaceHighest,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Typography.headlineMd,
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalHint: { ...Typography.bodySm, color: Colors.outlineVariant, textAlign: 'center', marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md },
});

const macroStyles = StyleSheet.create({
  chip: {
    flex: 1,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  value: { ...Typography.titleSm, color: Colors.onSurface },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: 2 },
});
