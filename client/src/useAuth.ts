import {
  AZURE_CLIENT_ID,
  AZURE_INITIAL_DOMAIN_NAME,
  AZURE_POLICY_SIGNIN_NAME,
  CUSTOM_B2C_API_URI,
  STORAGE_KEY_TOKEN,
} from '../config.json';
import React, { useEffect, useRef, useState } from 'react';
import type { RequestProps, ResponseTokenFromB2C } from '../App';

import { Platform } from 'react-native';
import type {ResponseDecodeJwt} from './UserFlow';
import jwt_decode from 'jwt-decode';
import { useAsyncStorage } from '@react-native-async-storage/async-storage';

export type DisplayUserInfo = {
  id: string;
  idp?: string;
  idp_access_token?: string; //"ya29.a0ARrdaM-PF...", // social access_token
  givenName: string; //"tae-seong", // First name
  mail?: string | null;
  surname: string; //"park", // Last name
  displayName: string; //"Mymymy", // Name
};

export type UserInfo = {
  '@odata.context': string; // "https://graph.microsoft.com/v1.0/$metadata#users/$entity",
  '@odata.id': string; // "https://graph.microsoft.com/v2/0687d16e-34c0-42a5-a38e-1f27686b3d69/directoryObjects/8a2c27a2-604d-4351-838a-27ff918e1a9b/Microsoft.DirectoryServices.User",
  businessPhones: string[]; //Array [],
  displayName: string; // "slackuser",
  givenName: string; // "tae-seong",
  id: string; // "8a2c27a2-604d-4351-838a-27ff918e1a9b",
  jobTitle: string | null | undefined; // null,
  mail: string | null | undefined; // null,
  mobilePhone: string | null | undefined; // null,
  officeLocation: string | null | undefined; // null,
  preferredLanguage: string | null | undefined; // null,
  surname: string; // "park",
  userPrincipalName: string; // "cpim_62fe4c8e-2557-4cfe-9168-ca1989410312@geoseong.onmicrosoft.com",
};

const SERVER_URL = `${CUSTOM_B2C_API_URI}/auth`;
const AZURE_REQ_TOKEN_SIGNIN_URL = `https://${AZURE_INITIAL_DOMAIN_NAME}.b2clogin.com/${AZURE_INITIAL_DOMAIN_NAME}.onmicrosoft.com/${AZURE_POLICY_SIGNIN_NAME}/oauth2/v2.0/token`;


const useAuth = ({redirectUrl, accessToken}: {redirectUrl: string; accessToken: string | null;}) => {
  const [userInfo, setUserInfo] = useState<DisplayUserInfo | null>(null);
  const { getItem, setItem } = useAsyncStorage(STORAGE_KEY_TOKEN);

  useEffect(() => {
    getUserProfile(accessToken);
  }, [accessToken]);

  const getUserProfile = async (accessToken: string | null): Promise<void> => {
    let strTokens = await getItem();
    if (!strTokens && !accessToken) {
      console.log(`getItem: no token from ${STORAGE_KEY_TOKEN}: ${strTokens}`);
      return;
    }
    strTokens = (strTokens || accessToken) as string;

    const tokens: ResponseTokenFromB2C = JSON.parse(strTokens);
    const refreshToken = tokens.refresh_token;

    console.log(
      `getItem: token from ${STORAGE_KEY_TOKEN}: ${JSON.stringify(
        tokens,
        null,
        2,
      )}`,
    );
    // refresh token expires, user have to signin manually
    if (tokens.refresh_token_expires_on && tokens.refresh_token_expires_on < new Date().getTime()) return;

    if (tokens.expires_on && tokens.expires_on * 1000 < new Date().getTime()) {
      await refreshAuthToken(refreshToken);
    } else {
      fetchUserProfile(tokens.access_token);
    }
  };

  const refreshAuthToken = async (refreshToken: string) => {
    const config: RequestProps = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body:
        `grant_type=refresh_token` +
        `&client_id=${AZURE_CLIENT_ID}` +
        `&scope=${AZURE_CLIENT_ID} offline_access` +
        `&refresh_token=${refreshToken}` +
        `&redirect_uri=${redirectUrl}`,
    };

    await fetch(AZURE_REQ_TOKEN_SIGNIN_URL, config)
      .then((response) => response.json())
      .then((response) => {
        console.log('----------------[App]success----------------');
        console.log({ response });
        if (response.error) return;

        let tokens: ResponseTokenFromB2C = response;
        tokens.refresh_token_expires_on = new Date((tokens.refresh_token_expires_in * 1000) + new Date().getTime()).getTime();
        
        console.log('refreshAuthToken', { tokens });

        setItem(JSON.stringify(tokens), (error) => {
          if (error)
            console.log(
              'refreshAuthToken save token error',
              JSON.stringify(error, null, 2),
            );
        });

        fetchUserProfile(tokens.access_token);
      })
      .catch((err) => {
        console.log('----------------[App]error----------------');
        console.log(err);
      });
  };
  const fetchUserProfile = async (accessToken: string) => {
    const config: RequestProps = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: null,
    };

    await fetch(SERVER_URL, config)
      .then((response) => response.json())
      .then((response) => {
        console.log('----------------[FETCH] success----------------');
        console.log({ response });
        if (response.error) return;

        // access_token 해독에서 나오는 emails와 AD graph api에서 얻는 실제 사용자의 email이 리턴값이 다름.
        // 그래서 존재하는 email값으로 적용.
        const decoded: ResponseDecodeJwt = jwt_decode(accessToken);
        
        const userInfo: UserInfo = response.result;
        setUserInfo({
          displayName: userInfo.displayName,
          givenName: userInfo.givenName,
          id: userInfo.id,
          surname: userInfo.surname,
          mail: decoded.emails?.length > 0 ? decoded.emails[0] : userInfo.mail,
        })
      })
      .catch((err) => {
        console.log('----------------[FETCH]error----------------');
        console.log(err);
      });

    // // example
    // const userInfo: UserInfo = {
    //   '@odata.context':
    //     'https://graph.microsoft.com/v1.0/$metadata#users/$entity',
    //   '@odata.id':
    //     'https://graph.microsoft.com/v2/0687d16e-34c0-42a5-a38e-1f27686b3d69/directoryObjects/8a2c27a2-604d-4351-838a-27ff918e1a9b/Microsoft.DirectoryServices.User',
    //   businessPhones: [],
    //   displayName: 'slackuser',
    //   givenName: 'tae-seong',
    //   id: '8a2c27a2-604d-4351-838a-27ff918e1a9b',
    //   jobTitle: null,
    //   mail: null,
    //   mobilePhone: null,
    //   officeLocation: null,
    //   preferredLanguage: null,
    //   surname: 'park',
    //   userPrincipalName:
    //     'cpim_62fe4c8e-2557-4cfe-9168-ca1989410312@geoseong.onmicrosoft.com',
    // };
    // setUserInfo({
    //   displayName: userInfo.displayName,
    //   givenName: userInfo.givenName,
    //   id: userInfo.id,
    //   surname: userInfo.surname,
    //   mail: userInfo.mail,
    // });
  };

  return { userInfo, setUserInfo };
};

export default useAuth;
