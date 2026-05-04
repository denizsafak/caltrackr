import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import SignInScreen from '@/app/sign-in';
import { useAuth } from '@/context/auth';

// Mock dependencies
jest.mock('expo-router', () => ({
  Link: ({ children }: any) => children,
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('@/context/auth', () => ({
  useAuth: jest.fn(),
}));

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
  UserRound: () => 'UserRoundIcon',
  Utensils: () => 'UtensilsIcon',
}));

describe('SignInScreen', () => {
  const mockSignIn = jest.fn();
  const mockSignInWithGoogle = jest.fn();
  const mockResetPassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      signInWithGoogle: mockSignInWithGoogle,
      resetPassword: mockResetPassword,
    });
    jest.spyOn(Alert, 'alert');
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<SignInScreen />);
    
    // Using placeholder since Card/Field maps to TextInput
    expect(getByText('Sign in')).toBeTruthy();
    expect(getByText('Continue with Google')).toBeTruthy();
  });

  it('handles successful email sign in', async () => {
    mockSignIn.mockResolvedValueOnce({});
    
    const { getByText } = render(<SignInScreen />);
    
    // We trigger submit
    fireEvent.press(getByText('Sign in'));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays an error on sign in failure', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Invalid credentials'));
    
    const { getByText } = render(<SignInScreen />);
    
    fireEvent.press(getByText('Sign in'));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
      expect(getByText('Invalid credentials')).toBeTruthy();
      expect(Alert.alert).toHaveBeenCalledWith('Sign in failed', 'Invalid credentials');
    });
  });
});