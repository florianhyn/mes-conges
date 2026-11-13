import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isLocal } from '@/lib/store';
import App from '@/components/App';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!isLocal()) {
    const session = await auth();
    if (!session?.user) redirect('/login');
  }
  return <App />;
}
