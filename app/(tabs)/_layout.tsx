import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Shadow } from '@/constants/theme';

function TabIcon({ name, label, focused }: { name: keyof typeof Ionicons.glyphMap; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Ionicons name={name} size={22} color={focused ? Colors.primary : Colors.outlineVariant} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

function TrackIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.trackButton, focused && styles.trackButtonActive]}>
      <Ionicons name="add" size={28} color={Colors.surfaceLowest} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} label="Planner" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          tabBarIcon: ({ focused }) => <TrackIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'restaurant' : 'restaurant-outline'} label="Recipes" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} label="Profile" focused={focused} />,
        }}
      />
      {/* Hide the template explore tab — recipes replaces it */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surfaceLowest,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 8,
    ...Shadow.modal,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    ...Typography.labelSm,
    color: Colors.outlineVariant,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  trackButton: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.onSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...Shadow.card,
  },
  trackButtonActive: {
    backgroundColor: Colors.primary,
  },
});
