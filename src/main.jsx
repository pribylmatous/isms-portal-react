import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './lib/auth.jsx';
import App from './App.jsx';
// Oficiální gov.cz design systém (@gov-design-system-ce) — tokens.css +
// jen CSS jednotlivé komponenty (gov-infobar), ne celé components.css,
// importované PŘED naším tokens.css, aby naše hodnoty --color-* (stejné
// názvy proměnných, ručně odhadnuté z Figma kitu — viz isms-portal-react
// README) zůstaly rozhodující a nezměnily vzhled zbytku appky. Nové
// sémantické proměnné (--spacing-*, --background-status-*, …), co u nás
// nejsou, se přidají bez kolize. Vynechané schválně: styles.css (globální
// reset dotýkající se holých elementů jako body/a — riziko pro stávající
// ručně stavěné UI) a ikony (fetchují se za běhu z pevné cesty
// /assets/icons/…, což by vyžadovalo kopírovat celou sadu SVG do public/).
import '@gov-design-system-ce/styles/tokens.css';
import '@gov-design-system-ce/styles/components/gov-infobar.css';
import '@gov-design-system-ce/fonts';
import './styles/tokens.css';
import './styles/portal.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
