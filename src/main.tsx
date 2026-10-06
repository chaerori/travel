import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isNativeApp } from './utils/nativePlatform'

if ('serviceWorker' in navigator && !isNativeApp()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
      .then((registration) => {
        // 새 서비스워커가 대기 상태가 되면 즉시 활성화하도록 지시한다.
        const activateWaitingWorker = () => {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        };
        activateWaitingWorker();
        registration.addEventListener('updatefound', () => {
          registration.installing?.addEventListener('statechange', function () {
            if (this.state === 'installed') activateWaitingWorker();
          });
        });

        registration.update();
        setInterval(() => registration.update(), 60_000);
      });

    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
