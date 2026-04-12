import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { readStoredProfile } from '../../utils/profileStorage';

export default function RequireProfile({ children }: { children: ReactNode }) {
  const profile = readStoredProfile();

  if (!profile) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}