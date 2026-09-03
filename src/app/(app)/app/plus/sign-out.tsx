'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/app/(auth)/actions';

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="secondary" className="w-full">
        <LogOut className="h-4 w-4" aria-hidden />
        Se déconnecter
      </Button>
    </form>
  );
}
