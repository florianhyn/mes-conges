import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (session?.user) redirect('/');
  const { error } = await searchParams;
  return (
    <div className="login">
      <div className="card">
        <h1>Mes congés</h1>
        <p>Suivi personnel de CA, sick leave et absences.</p>
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/' }); }}>
          <button className="btn primary google" type="submit" style={{ width: '100%' }}>Se connecter avec Google</button>
        </form>
        {error && <p className="err">Connexion refusée. Utilisez le compte Google autorisé.</p>}
      </div>
    </div>
  );
}
