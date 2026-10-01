import { StoreProvider, useStore } from './context/Store';
import Layout from './components/Layout';
import Login from './components/Login';
import PrivacyModal from './components/PrivacyModal';
import StudentPortal from './components/StudentPortal';

function Gate() {
  const { privacyAccepted, session } = useStore();
  return (
    <>
      {!privacyAccepted && <PrivacyModal />}
      {!session && <Login />}
      {session?.role === 'student' && <StudentPortal />}
      {session && session.role !== 'student' && <Layout />}
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Gate />
    </StoreProvider>
  );
}
