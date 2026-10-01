import { useEffect } from 'react';
import { useStore } from '../context/Store';
import { normalizePath } from '../lib/routes';
import Layout from './Layout';
import Login from './Login';
import PrivacyModal from './PrivacyModal';
import StudentPortal from './StudentPortal';

export default function LoginAndHome() {
  const { privacyAccepted, session } = useStore();

  useEffect(() => {
    if (!session) return;
    const path = normalizePath(window.location.pathname);
    if (session.role === 'student' && path !== '/portal') {
      window.history.replaceState({}, '', '/portal');
    }
    if (session.role !== 'student' && (path === '/' || path === '/portal')) {
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [session]);

  return (
    <>
      {!privacyAccepted && <PrivacyModal />}
      {!session && <Login />}
      {session?.role === 'student' && <StudentPortal />}
      {session && session.role !== 'student' && <Layout />}
    </>
  );
}
