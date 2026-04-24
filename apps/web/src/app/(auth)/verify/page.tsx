'use client';

import React from 'react';
import { VerifyForm } from '@/components/auth/verify-form';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function VerifyPage() {
  const router = useRouter();
  const { login } = useAuth();

  const handleVerifySuccess = () => {
    // Set a mock session and role
    login('admin@finbooks.com', 'password');
    // Navigate to admin dashboard after successful verification
    router.push('/admin');
  };

  return <VerifyForm onSuccess={handleVerifySuccess} />;
}
