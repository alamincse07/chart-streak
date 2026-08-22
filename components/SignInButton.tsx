'use client';
import { signIn } from 'next-auth/react';

export function SignInButton({ label = 'Sign in with Google' }: { label?: string }) {
  return (
    <button
      onClick={() => signIn('google')}
      style={{
        background: '#0f172a',
        color: '#fff',
        border: 'none',
        padding: '12px 22px',
        borderRadius: 8,
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
