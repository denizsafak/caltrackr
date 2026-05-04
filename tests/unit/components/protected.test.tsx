import React from 'react';
import { render } from '@testing-library/react-native';
import { Redirect } from 'expo-router';

import { Protected } from '@/components/protected';
import { useAuth } from '@/context/auth';

// Mock the authentication context
jest.mock('@/context/auth', () => ({
  useAuth: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

// Mock UI components
jest.mock('@/components/ui', () => ({
  LoadingState: () => <test-file-stub testID="loading-state" />,
}));

describe('Protected Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the loading state when auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({ loading: true, user: null });

    const { getByTestId } = render(
      <Protected>
        <test-file-stub testID="child-component" />
      </Protected>
    );

    expect(getByTestId('loading-state')).toBeTruthy();
  });

  it('redirects to sign-in when no user is authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({ loading: false, user: null });

    render(
      <Protected>
        <test-file-stub testID="child-component" />
      </Protected>
    );

    const redirectMock = Redirect as unknown as jest.Mock;
    expect(redirectMock.mock.calls[0][0]).toEqual(expect.objectContaining({ href: '/sign-in' }));
  });

  it('renders children when user is authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({ loading: false, user: { id: '123' } });

    const { getByTestId } = render(
      <Protected>
        <test-file-stub testID="child-component" />
      </Protected>
    );

    expect(getByTestId('child-component')).toBeTruthy();
  });
});
