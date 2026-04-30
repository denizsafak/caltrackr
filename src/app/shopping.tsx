import { Check, Share2, ShoppingBasket } from 'lucide-react-native';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Protected } from '@/components/protected';
import { AppShell, Button, Card, LoadingState, PageHeader, SectionTitle } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data';

export default function ShoppingScreen() {
  return (
    <Protected>
      <ShoppingContent />
    </Protected>
  );
}

function ShoppingContent() {
  const { activeShoppingList, loading, generateShoppingList, toggleShoppingItem } = useAppData();

  if (loading) return <LoadingState />;

  const checkedCount = activeShoppingList?.items.filter((item) => item.checked).length ?? 0;
  const totalCount = activeShoppingList?.items.length ?? 0;

  const shareList = async () => {
    if (!activeShoppingList) return;
    const message = activeShoppingList.items.map((item) => `${item.checked ? '[x]' : '[ ]'} ${item.label} - ${item.quantity}`).join('\n');
    try {
      await Share.share({ title: activeShoppingList.title, message });
    } catch {
      Alert.alert('Share unavailable', message);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Shopping list"
        title={activeShoppingList?.title ?? 'Shopping List'}
        subtitle="Generated from the current weekly plan and persisted per signed-in user."
        action={
          <>
            <Button variant="secondary" icon={ShoppingBasket} onPress={generateShoppingList}>
              Regenerate
            </Button>
            <Button icon={Share2} onPress={shareList} disabled={!activeShoppingList}>
              Share
            </Button>
          </>
        }
      />

      <View style={styles.grid}>
        <Card tone="soft" style={styles.progressCard}>
          <Text style={styles.progressValue}>
            {checkedCount}/{totalCount}
          </Text>
          <Text style={styles.progressLabel}>Items checked</Text>
        </Card>

        <View style={styles.listWrap}>
          <SectionTitle title="Ingredients" />
          {activeShoppingList ? (
            <View style={styles.items}>
              {activeShoppingList.items.map((item) => (
                <Pressable key={item.id} onPress={() => toggleShoppingItem(item.id)} style={styles.item}>
                  <View style={[styles.checkbox, item.checked && styles.checkboxActive]}>
                    {item.checked ? <Check size={16} color={colors.white} /> : null}
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={[styles.itemTitle, item.checked && styles.itemTitleChecked]}>{item.label}</Text>
                    <Text style={styles.itemMeta}>{item.quantity}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <Card tone="low">
              <Text style={styles.itemTitle}>No shopping list yet</Text>
              <Text style={styles.itemMeta}>Generate one from the planner.</Text>
            </Card>
          )}
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
    alignItems: 'flex-start',
  },
  progressCard: {
    flex: 1,
    minWidth: 240,
    minHeight: 180,
    justifyContent: 'flex-end',
  },
  progressValue: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
    fontSize: 58,
  },
  progressLabel: {
    color: colors.primary,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  listWrap: {
    flex: 2,
    minWidth: 320,
    gap: spacing.md,
  },
  items: {
    gap: spacing.md,
  },
  item: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  checkbox: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
  },
  itemCopy: {
    flex: 1,
  },
  itemTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 16,
    textTransform: 'capitalize',
  },
  itemTitleChecked: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  itemMeta: {
    color: colors.muted,
    fontFamily: fonts.medium,
  },
});
