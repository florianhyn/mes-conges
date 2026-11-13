import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

/** Seule l'adresse ALLOWED_EMAIL peut se connecter. */
const allowed = () => (process.env.ALLOWED_EMAIL ?? '').trim().toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login', error: '/login' },
  trustHost: true,
  callbacks: {
    signIn({ profile }) {
      return !!allowed() && profile?.email_verified !== false && profile?.email?.toLowerCase() === allowed();
    },
  },
});

/** Vrai si la requête vient de l'utilisateur autorisé (ou en mode DEV_LOCAL). */
export async function isAuthorized() {
  if (process.env.DEV_LOCAL === '1' && process.env.NODE_ENV !== 'production') return true;
  const session = await auth();
  return !!session?.user?.email && session.user.email.toLowerCase() === allowed();
}
