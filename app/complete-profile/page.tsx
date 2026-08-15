'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function CompleteProfilePage() {
  const { data: session, status: sessionStatus, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState(session?.user?.name || '');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErrorMsg(json.error || 'Something went wrong, please try again.');
      setSubmitting(false);
      return;
    }

    // Force the session/JWT to refresh so middleware sees the new phone
    // number on the very next request, instead of redirecting back here.
    await update();
    router.push('/');
  };

  if (sessionStatus === 'loading') {
    return (
      <main style={{ padding: '2rem', maxWidth: 420 }}>
        <p>Loading…</p>
      </main>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    router.push('/api/auth/signin');
    return null;
  }

  return (
    <main style={{ padding: '2rem', maxWidth: 420 }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Complete your profile</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        We need your name and phone number before you can request access to
        any sheets. This is stored alongside your account and only visible
        to admins.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Full name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 123 4567"
            required
            style={{ width: '100%' }}
          />
        </div>

        {errorMsg && <p style={{ color: 'crimson', fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </main>
  );
}
