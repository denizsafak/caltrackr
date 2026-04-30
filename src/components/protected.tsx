import { Redirect } from 'expo-router';
import { PropsWithChildren } from 'react';

import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/auth';

export function Protected({ children }: PropsWithChildren) {
  const { loading, user } = useAuth();

  if (loading) return <LoadingState />;
  if (!user) return <Redirect href="/sign-in" />;

  return children;
}
