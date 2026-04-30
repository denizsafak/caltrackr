import { Redirect } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/auth';

export default function Index() {
  const { loading, user } = useAuth();

  if (loading) return <LoadingState />;

  return <Redirect href={user ? '/dashboard' : '/sign-in'} />;
}
