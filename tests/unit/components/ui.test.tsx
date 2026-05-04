import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import {
  Button,
  IconButton,
  Card,
  PageHeader,
  Metric,
  ProgressBar,
  MacroBars,
  Field,
  Chip,
  SectionTitle,
  TotalLine,
  LinkButton,
  LoadingState,
  AppShell
} from '@/components/ui';

jest.mock('expo-router', () => ({
  Link: jest.fn(({ children }) => children),
  usePathname: jest.fn(() => '/dashboard'),
}));

jest.mock('@/context/app-data', () => ({
  useAppData: jest.fn(() => ({ profile: { role: 'user' } })),
}));

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
  ArrowRight: () => 'ArrowRightIcon',
  Bell: () => 'BellIcon',
  CalendarDays: () => 'CalendarDaysIcon',
  ChefHat: () => 'ChefHatIcon',
  Home: () => 'HomeIcon',
  Plus: () => 'PlusIcon',
  Settings: () => 'SettingsIcon',
  ShieldCheck: () => 'ShieldCheckIcon',
  ShoppingBasket: () => 'ShoppingBasketIcon',
  Utensils: () => 'UtensilsIcon',
  User: () => 'UserIcon',
  Users: () => 'UsersIcon',
}));

describe('UI Components', () => {
  describe('Button Component', () => {
    it('renders children text correctly', () => {
      const { getByText } = render(<Button>Click Me</Button>);
      expect(getByText('Click Me')).toBeTruthy();
    });

    it('calls onPress when clicked', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Button onPress={onPressMock}>Submit</Button>
      );

      fireEvent.press(getByText('Submit'));
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Button onPress={onPressMock} disabled={true}>
          Submit
        </Button>
      );

      fireEvent.press(getByText('Submit'));
      expect(onPressMock).not.toHaveBeenCalled();
    });
  });

  describe('Other UI Components', () => {
    it('renders IconButton', () => {
      const onPress = jest.fn();
      const { getByTestId, root } = render(<IconButton icon={require('lucide-react-native').Bell} onPress={onPress} />);
      expect(root).toBeTruthy();
    });

    it('renders Card', () => {
      const { getByText } = render(<Card><Text>Card Content</Text></Card>);
      expect(getByText('Card Content')).toBeTruthy();
    });

    it('renders PageHeader', () => {
      const { getByText } = render(<PageHeader title="Title" subtitle="Sub" eyebrow="Eye" />);
      expect(getByText('Title')).toBeTruthy();
      expect(getByText('Sub')).toBeTruthy();
      expect(getByText('Eye')).toBeTruthy();
    });

    it('renders Metric', () => {
      const { getByText } = render(<Metric label="Calories" value={2000} unit="kcal" />);
      expect(getByText('Calories')).toBeTruthy();
      expect(getByText('2000')).toBeTruthy();
      expect(getByText('kcal')).toBeTruthy();
    });

    it('renders ProgressBar', () => {
      render(<ProgressBar value={50} />);
    });

    it('renders MacroBars', () => {
      render(<MacroBars totals={{ protein: 10, carbs: 20, fats: 30 }} targets={{ protein: 100, carbs: 200, fats: 50 }} />);
    });

    it('renders Field', () => {
      const { getByText, getByPlaceholderText } = render(<Field label="Email" placeholder="Enter email" />);
      expect(getByText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Enter email')).toBeTruthy();
    });

    it('renders Chip', () => {
      const onPress = jest.fn();
      const { getByText } = render(<Chip label="Active" active onPress={onPress} />);
      fireEvent.press(getByText('Active'));
      expect(onPress).toHaveBeenCalled();
    });

    it('renders SectionTitle', () => {
      const { getByText } = render(<SectionTitle title="Section" />);
      expect(getByText('Section')).toBeTruthy();
    });

    it('renders TotalLine', () => {
      const { getByText } = render(<TotalLine label="Total" value={500} />);
      expect(getByText('Total')).toBeTruthy();
      expect(getByText('500 kcal')).toBeTruthy(); // Assuming formatCalories appends kcal
    });

    it('renders LinkButton', () => {
      const { getByText } = render(<LinkButton href="/test" label="Go" />);
      expect(getByText('Go')).toBeTruthy();
    });

    it('renders LoadingState', () => {
      render(<LoadingState />);
    });

    it('renders AppShell', () => {
      const { getByText } = render(<AppShell><Text>Shell Content</Text></AppShell>);
      expect(getByText('Shell Content')).toBeTruthy();
    });
  });
});
