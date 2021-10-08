import {AZURE_CLIENT_ID, AZURE_INITIAL_DOMAIN_NAME, AZURE_POLICY_SIGNIN_NAME} from '../../config.json';

import type { B2CConfiguration } from './b2cClient';

export const b2cConfig: B2CConfiguration = {
  auth: {
    clientId: AZURE_CLIENT_ID, //'fc8ecae3-0883-45f4-ac1c-013dfa11cb9c',
    authorityBase: `https://${AZURE_INITIAL_DOMAIN_NAME}.b2clogin.com/${AZURE_INITIAL_DOMAIN_NAME}.onmicrosoft.com/`,
    policies: {
      signInSignUp: AZURE_POLICY_SIGNIN_NAME,
      passwordReset: 'B2C_1_PasswordReset',
    },
  },
  // web only:
  cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: true },
};

export const b2cScopes = [`https://${AZURE_INITIAL_DOMAIN_NAME}.onmicrosoft.com/api/read offline_access`];