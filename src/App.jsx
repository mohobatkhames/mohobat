import { StoreProvider } from './context/Store';
import LoginAndHome from './components/LoginAndHome';

export default function App() {
  return (
    <StoreProvider>
      <LoginAndHome />
    </StoreProvider>
  );
}
