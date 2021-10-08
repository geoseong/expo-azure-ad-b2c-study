import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import {
  AZURE_CLIENT_ID,
  AZURE_INITIAL_DOMAIN_NAME,
  AZURE_POLICY_EDIT_NAME,
  AZURE_POLICY_SIGNIN_NAME,
  STORAGE_KEY_TOKEN,
} from '../config.json';
import type { MSALResult, MSALWebviewParams } from 'react-native-msal';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect } from 'react';
import type { RequestProps, ResponseTokenFromB2C } from '../App';
import { b2cConfig, b2cScopes as scopes } from './web/msalConfig';

import B2CClient from './web/b2cClient';
import jwt_decode from 'jwt-decode';
import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import useAuth from './useAuth';

const b2cClient = new B2CClient(b2cConfig, false);

type RequestSignInType = 'signin' | 'edit';

export type ResponseDecodeJwt = {
  iss: string; // "https://geoseong.b2clogin.com/0687d16e-34c0-42a5-a38e-1f27686b3d69/v2.0/
  exp: number; //1632649270,
  nbf: number; //1632645670,
  aud: string; //"53be8970-3d57-4484-8712-defdf11e9f48",
  idp_access_token: string; //"ya29.a0ARrdaM-...",
  given_name: string; //"tae-seong",
  family_name: string; //"park",
  name: string; //"Mymymy",
  emails: string[];
  idp: string; //"google.com",
  sub: string; //"8a2c27a2-604d-4351-838a-27ff918e1a9b", <- User ID
  tfp: string; //"B2C_1_geoseongapp_edit",
  nonce: string; //"defaultNonce",
  azp: string; //"53be8970-3d57-4484-8712-defdf11e9f48",
  ver: string; //"1.0",
  iat: number; //1632645670
};

type WebAuthClaim = {
  exp: number;
  nbf: number;
  ver: string;
  iss: string;
  sub: string;
  aud: string;
  nonce: string;
  iat: number;
  auth_time: number;
  idp_access_token: string;
  given_name: string;
  family_name: string;
  name: string;
  idp: string;
  emails: string[];
  tfp: string;
  at_hash: string;
}

type FnParam = ((param: any) => void) | null;

const AZURE_APPLICATION_ID = `https://${AZURE_INITIAL_DOMAIN_NAME}.onmicrosoft.com/api`;
const AZURE_REQ_TOKEN_SIGNIN_URL = `https://${AZURE_INITIAL_DOMAIN_NAME}.b2clogin.com/${AZURE_INITIAL_DOMAIN_NAME}.onmicrosoft.com/${AZURE_POLICY_SIGNIN_NAME}/oauth2/v2.0/token`;
const AZURE_REQ_TOKEN_EDIT_URL = `https://${AZURE_INITIAL_DOMAIN_NAME}.b2clogin.com/${AZURE_INITIAL_DOMAIN_NAME}.onmicrosoft.com/${AZURE_POLICY_EDIT_NAME}/oauth2/v2.0/token`;

export const REDIRECT_URL =
  Platform.OS === 'web' ? 'http://localhost:19006' : Linking.createURL('auth'); // exp://127.0.0.1:19000/--/auth or expoazurestudy://auth
const RESPONSE_TYPE = Platform.OS === 'web' ? 'token' : 'code';
const SCOPE =
  Platform.OS === 'web'
    ? `${AZURE_APPLICATION_ID}/read`
    : `${AZURE_CLIENT_ID}%20offline_access%20profile`;

const LOGOUT_REDIRECT_URL =
  Platform.OS === 'web'
    ? 'http://localhost:19006/logout'
    : Linking.createURL('logout');
const AZURE_LOGOUT_URL = `https://${AZURE_INITIAL_DOMAIN_NAME}.b2clogin.com/${AZURE_INITIAL_DOMAIN_NAME}.onmicrosoft.com/${AZURE_POLICY_EDIT_NAME}/oauth2/v2.0/logout?post_logout_redirect_uri=${LOGOUT_REDIRECT_URL}`;

// reference: https://docs.microsoft.com/ko-kr/azure/active-directory/develop/v2-oauth2-implicit-grant-flow
const getUserFlowEndpoint = (isEdit: boolean) =>
  `https://${AZURE_INITIAL_DOMAIN_NAME}.b2clogin.com/${AZURE_INITIAL_DOMAIN_NAME}.onmicrosoft.com/oauth2/v2.0/authorize` +
  `?p=${isEdit ? AZURE_POLICY_EDIT_NAME : AZURE_POLICY_SIGNIN_NAME}` +
  `&client_id=${AZURE_CLIENT_ID}` +
  `&nonce=defaultNonce` +
  `&redirect_uri=${REDIRECT_URL}` +
  `&response_type=${RESPONSE_TYPE}` + // + `&response_type=id_token`
  `&scope=${SCOPE}` +
  `&prompt=login`;

const decodeJwtToken = (code: string): ResponseDecodeJwt => {
  const decoded = jwt_decode(code);
  return decoded as ResponseDecodeJwt;
};

const UserFlow = () => {
  const [webAuthResult, setWebAuthResult] = React.useState<MSALResult | null>(null);
  const [webAccessToken, setWebAccessToken] = React.useState<string | null>(null);
  const { getItem, setItem, removeItem } = useAsyncStorage(STORAGE_KEY_TOKEN);
  const { userInfo, setUserInfo } = useAuth({ redirectUrl: REDIRECT_URL, accessToken: webAccessToken });

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      console.log({ url });
      if (!url) return;

      if (Platform.OS === 'web') {
        url = url.replace('#', '?');
        const parsedResult = Linking.parse(url);
        console.log({ parsedResult });

        if (
          !parsedResult?.queryParams?.access_token &&
          parsedResult.path !== 'logout'
        )
          return;

        let webResult = WebBrowser.maybeCompleteAuthSession();
        console.log({ webResult });
        if (webResult.type === 'failed')
          console.log('[failed] web browser closing is not working');
      }
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    async function init() {
      try {
        await b2cClient.init();
        const isSignedIn = await b2cClient.isSignedIn();
        if (isSignedIn) {
          // 하루만에 접속하면 아래 에러 나오는 경우가 생김.
          // AADB2C90077: User does not have an existing session and request prompt parameter has a value of 'None'
          // 에러 나오면 catch에서 signOut시키게 임시방편으로 구현
          setWebAuthResult(await b2cClient.acquireTokenSilent({ scopes }));
        }
      } catch (error) {
        //@ts-ignore
        console.error('<<<<<<error>>>>>>', error.message);
        b2cClient.signOut();
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!webAuthResult || !webAuthResult?.account?.claims) return;
    setWebAccessToken(JSON.stringify({access_token: webAuthResult.accessToken}));
    
    console.log(`accessToken: ${webAuthResult.accessToken}`);
    console.log(`username: ${webAuthResult.account.username}`);
    console.log(`identifier: ${webAuthResult.account.identifier}`);
    console.log(`tenantId: ${webAuthResult.account.tenantId}`);
    console.log(`environment: ${webAuthResult.account.environment}`);
    console.log(`claims: ${JSON.stringify(webAuthResult.account.claims, null, 2)}`);
    console.log(`expiresOn: ${webAuthResult.expiresOn}`);
    console.log(`scopes: ${webAuthResult.scopes}`);
    console.log(`idToken: ${webAuthResult.idToken}`);
    console.log(`tenantId: ${webAuthResult.tenantId}`);
  }, [webAuthResult])

  const setToken = async (tokens: ResponseTokenFromB2C): Promise<void> => {
    tokens.refresh_token_expires_on = new Date(
      tokens.refresh_token_expires_in * 1000 + new Date().getTime(),
    ).getTime();
    await setItem(JSON.stringify(tokens), (error) => {
      if (error) {
        console.log(
          'setToken save token error',
          JSON.stringify(error, null, 2),
        );
        return;
      }
    });
  };

  const handleSignInPress = async () => {
    try {
      const res = await b2cClient.signIn({ scopes });
      const claims = res.account.claims as WebAuthClaim;
      setUserInfo({
        id: claims.sub,
        idp: claims.idp,
        idp_access_token: claims.idp_access_token,
        displayName: claims.name,
        givenName: claims.given_name,
        surname: claims.family_name,
        mail: claims.emails?.length > 0 ? claims.emails[0] : undefined,
      });
    } catch (error) {
      console.warn(error);
    }
  };
  const handleSignoutPress = async () => {
    try {
      await b2cClient.signOut();
      setWebAuthResult(null);
    } catch (error) {
      console.warn(error);
    }
  };

  const saveTokenForWebPlatform = async (
    accessToken: string,
  ): Promise<void> => {
    const strTokens = await getItem();
    let signedInTokens: ResponseTokenFromB2C | null = !strTokens
      ? null
      : JSON.parse(strTokens);
    const refreshToken = !signedInTokens
      ? AZURE_REFRESH_TOKEN
      : signedInTokens.refresh_token;

    console.log({ signedInTokens, refreshToken });

    let tokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
    await setItem(JSON.stringify(tokens), (error) => {
      if (error) {
        console.log(
          'saveTokenForWebPlatform save token error',
          JSON.stringify(error, null, 2),
        );
        return;
      }
    });
  };

  const setUserProfile = (profileInfo: ResponseDecodeJwt) => {
    setUserInfo({
      id: profileInfo.sub,
      idp: profileInfo.idp,
      idp_access_token: profileInfo.idp_access_token,
      displayName: profileInfo.name,
      givenName: profileInfo.given_name,
      surname: profileInfo.family_name,
      mail: profileInfo.emails?.length > 0 ? profileInfo.emails[0] : undefined,
    });
  };

  const onOpenAuthWebBrowser = async () => {
    if (Platform.OS === 'web') {
      handleSignInPress();
      return;
    }
    const userFlowEndpoint = getUserFlowEndpoint(false);
    let result = await WebBrowser.openAuthSessionAsync(
      userFlowEndpoint,
      REDIRECT_URL,
    );
    console.log(JSON.stringify(result, null, 2));

    if (result.type !== 'success') {
      return;
    }

    let resultUrl = (result as WebBrowser.WebBrowserRedirectResult).url;
    const parsedResult = Linking.parse(resultUrl);
    console.log(parsedResult);

    if (parsedResult?.queryParams?.error) return;
    
    getAuthToken(
      parsedResult?.queryParams?.code as string,
      'signin',
      (tokens) => setToken(tokens),
    );
  };

  const onOpenAuthEditWebBrowser = async () => {
    const userFlowEndpoint = getUserFlowEndpoint(true);
    let result = await WebBrowser.openAuthSessionAsync(
      userFlowEndpoint,
      REDIRECT_URL,
    );
    console.log(JSON.stringify(result, null, 2));

    if (result.type !== 'success') {
      return;
    }

    let resultUrl = (result as WebBrowser.WebBrowserRedirectResult).url;
    resultUrl = Platform.OS === 'web' ? resultUrl.replace('#', '?') : resultUrl;
    const parsedResult = Linking.parse(resultUrl);
    console.log(parsedResult);

    if (parsedResult?.queryParams?.error) return;

    if (Platform.OS === 'web') {
      const accessToken = parsedResult?.queryParams?.access_token as string;
      saveTokenForWebPlatform(accessToken);

      const profileInfo = decodeJwtToken(accessToken);
      setUserProfile(profileInfo);
      return;
    }
    getAuthToken(
      parsedResult?.queryParams?.code as string,
      'edit',
      async (tokens: ResponseTokenFromB2C) => {
        const strTokens = await getItem();
        if (!strTokens) return;

        let signedInTokens: ResponseTokenFromB2C = JSON.parse(strTokens);
        signedInTokens.access_token = tokens.access_token;
        setToken(signedInTokens);
      },
    );
  };

  const getAuthToken = async (
    code: string,
    type: RequestSignInType = 'signin',
    cb: FnParam = null,
  ) => {
    const reqUrl =
      type === 'signin' ? AZURE_REQ_TOKEN_SIGNIN_URL : AZURE_REQ_TOKEN_EDIT_URL;
    const config: RequestProps = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body:
        `grant_type=authorization_code` +
        `&response_type=token` +
        `&client_id=${AZURE_CLIENT_ID}` +
        `&scope=${AZURE_CLIENT_ID} offline_access` +
        `&code=${code}` +
        `&redirect_uri=${REDIRECT_URL}`,
    };

    await fetch(reqUrl, config)
      .then((response) => response.json())
      .then((response: ResponseTokenFromB2C) => {
        console.log('----------------success----------------');
        console.log({ response });

        const profileInfo = decodeJwtToken(response.access_token);
        setUserProfile(profileInfo);

        if (cb) cb(response);
      })
      .catch((err) => {
        console.log('----------------error----------------');
        console.log(err);
      });
  };

  const onLogout = async () => {
    if (Platform.OS === 'web') {
      handleSignoutPress();
      return;
    }
    let result = await WebBrowser.openAuthSessionAsync(
      AZURE_LOGOUT_URL,
      LOGOUT_REDIRECT_URL,
    );
    console.log(JSON.stringify(result, null, 2));
    // B2C 앱의 SPA(단일 페이지 어플리케이션) 리디렉션 URI을 'http://localhost:19006/logout' 추가
    if (result.type !== 'success') {
      return;
    }

    setUserInfo(null);
    await removeItem();
  };

  const onReqAuthInfo = () => {
    const code = '[code-for-test]';
    getAuthToken(code);
  };

  const onGetTokenDecode = () => {
    const token = '[token-for-test]';
    decodeJwtToken(token);
  };

  return (
    <View style={styles.container}>
      {!userInfo && (
        <>
          <Text>Not Signed In!</Text>
          <TouchableOpacity
            onPress={onOpenAuthWebBrowser}
            style={[
              styles.button,
              {
                backgroundColor: '#5cc400',
              },
            ]}
          >
            <Text>{'Azure SignUp and SignIn!!'}</Text>
          </TouchableOpacity>
        </>
      )}
      {userInfo && (
        <>
          <Text>ID: {userInfo.id}</Text>
          <Text>DisplayName: {userInfo.displayName || '-'}</Text>
          <Text>GivenName: {userInfo.givenName || '-'}</Text>
          <Text>SurName: {userInfo.surname || '-'}</Text>
          <Text>Email: {userInfo.mail || '-'}</Text>
          <TouchableOpacity
            onPress={onOpenAuthEditWebBrowser}
            style={[
              styles.button,
              {
                backgroundColor: '#ededed',
              },
            ]}
          >
            <Text>{'Edit Profile'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onLogout}
            style={[
              styles.button,
              {
                backgroundColor: '#000000',
              },
            ]}
          >
            <Text style={{ color: '#ffffff' }}>{'LogOut'}</Text>
          </TouchableOpacity>
        </>
      )}
      {/* Temp */}
      {/* <TouchableOpacity onPress={onGetTokenDecode} style={[styles.button, { backgroundColor: '#214402' }]}>
        <Text>Get Token Decode</Text>
      </TouchableOpacity> */}
      {/* <TouchableOpacity onPress={onReqAuthInfo} style={[styles.button, { backgroundColor: 'black' }]}>
        <Text style={{ color: 'white' }}>Token Request</Text>
      </TouchableOpacity> */}
    </View>
  );
};
export default UserFlow;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    margin: 10,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  webview: {
    borderColor: 'green',
    borderWidth: 2,
  },
  authInfo: {
    width: '100%',
    padding: 4,
  },
  authInfoItem: {
    borderBottomColor: 'black',
    borderBottomWidth: 1,
    padding: 4,
    paddingHorizontal: 8,
  },
});
