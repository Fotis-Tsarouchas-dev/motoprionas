import type { Metadata } from 'next';
import SetPassword from '@/components/admin/SetPassword';

export const metadata: Metadata = {
  title: 'Ορισμός κωδικού πρόσβασης',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SetPasswordPage() {
  return <SetPassword />;
}
