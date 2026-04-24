import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardContent className="pt-6">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
