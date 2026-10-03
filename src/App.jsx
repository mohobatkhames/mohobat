import { useState } from 'react';
import { StoreProvider } from './context/Store';
import LoginAndHome from './components/LoginAndHome';
import SetupWizard from './components/SetupWizard';
import { bootstrapProject } from './firebase';

export default function App() {
  const [ready, setReady] = useState(() => {
    try {
      return bootstrapProject() === 'ready';
    } catch {
      return false;
    }
  });

  if (!ready) {
    return <SetupWizard onDone={() => setReady(true)} />;
  }

  return (
    <StoreProvider>
      <LoginAndHome />
    </StoreProvider>
  );
}
