import { useState } from 'react';
import { StoreProvider } from './context/Store';
import LoginAndHome from './components/LoginAndHome';
import SetupWizard from './components/SetupWizard';
import { resolveEntry } from './AuthGuard';

export default function App() {
  const [entry, setEntry] = useState(() => resolveEntry());

  if (entry === 'setup') {
    return <SetupWizard onDone={() => setEntry('login')} />;
  }

  return (
    <StoreProvider>
      <LoginAndHome />
    </StoreProvider>
  );
}
