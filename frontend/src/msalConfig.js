/**
 * MSAL (Microsoft Authentication Library) configuration for Azure AD SSO.
 *
 * Environment variables (set in .env):
 *   VITE_MS_SSO_CLIENT_ID  - Azure AD App Registration Client ID
 *   VITE_MS_SSO_TENANT_ID  - Azure AD Tenant ID
 *   VITE_MS_SSO_REDIRECT   - Redirect URI (defaults to current origin)
 */
import { PublicClientApplication } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_MS_SSO_CLIENT_ID || '';
const tenantId = import.meta.env.VITE_MS_SSO_TENANT_ID || '';
const redirectUri = import.meta.env.VITE_MS_SSO_REDIRECT || window.location.origin;

export const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

export const msalInstance = new PublicClientApplication(msalConfig);
