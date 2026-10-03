import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-app min-h-screen grid place-items-center p-6" dir="rtl">
          <div className="card max-w-lg p-6">
            <h1 className="text-xl font-extrabold mb-2">تعذر عرض النظام</h1>
            <p className="text-mute">{this.state.error.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </React.StrictMode>,
);

document.getElementById('boot-splash')?.remove();
