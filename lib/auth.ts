import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions } from 'next-auth';
import { supabaseAdmin } from './supabase';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Anyone with a Google account can sign in — access to actual sheet
      // data is gated separately by `status`, and by having completed their
      // profile (name + phone), both checked elsewhere, not here.
      if (!user.email) return false;

      const bootstrapAdmins = (process.env.BOOTSTRAP_ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id, status, is_admin')
        .eq('email', user.email)
        .maybeSingle();

      const isBootstrapAdmin = bootstrapAdmins.includes(user.email.toLowerCase());

      await supabaseAdmin.from('users').upsert(
        {
          google_id: account?.providerAccountId,
          email: user.email,
          // Don't overwrite name here if the user already customized it via
          // the complete-profile form — only set it from Google on first
          // insert (existing check below).
          name: existing ? undefined : user.name,
          avatar_url: user.image,
          last_login_at: new Date().toISOString(),
          status: existing?.status ?? (isBootstrapAdmin ? 'approved' : 'pending'),
          is_admin: existing?.is_admin ?? isBootstrapAdmin,
        },
        { onConflict: 'email' }
      );
      return true;
    },
    async jwt({ token }) {
      // Refresh from the DB on every request so status/phone/admin changes
      // (e.g. an admin approving someone, or the user completing their
      // profile) take effect without needing to sign out and back in.
      if (token.email) {
        const { data } = await supabaseAdmin
          .from('users')
          .select('id, name, phone, status, is_admin')
          .eq('email', token.email)
          .maybeSingle();

        token.userId = data?.id ?? null;
        token.name = data?.name ?? token.name;
        token.phone = data?.phone ?? null;
        token.status = data?.status ?? 'pending';
        token.isAdmin = data?.is_admin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).phone = token.phone;
        (session.user as any).status = token.status;
        (session.user as any).isAdmin = token.isAdmin;
      }
      return session;
    },
  },
};
