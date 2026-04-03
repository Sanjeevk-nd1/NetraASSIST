import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './msalConfig';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

async function initApp() {
  await msalInstance.initialize();

  // Process redirect response BEFORE rendering React
  // This ensures tokens are in localStorage before AuthContext checks them
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response && response.idToken) {
      console.log('[SSO] Redirect returned idToken, exchanging with backend...');
      const res = await fetch('/api/auth/sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: response.idToken }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        console.log('[SSO] Login successful');
        // Clean up the URL hash
        window.location.hash = '';
      } else {
        console.error('[SSO] Backend returned', res.status, await res.text());
      }
    }
  } catch (e) {
    console.error('[SSO] Redirect handling error:', e);
  }

  // Render React app — AuthContext.checkAuth will pick up tokens from localStorage
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </MsalProvider>
    </React.StrictMode>
  );
}

initApp();
