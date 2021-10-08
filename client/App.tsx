import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';

import React from 'react';
import { ThemeProvider } from 'dooboo-ui';
import UserFlow from './src/UserFlow';

export type RequestProps = {
  method: string;
  headers: Record<string, string>;
  body: string | FormData | null;
};

export type ResponseTokenFromB2C = {
  access_token: string;
  expires_in: number;
  expires_on: number; // epoch time. ex. 1633347466
  id_token: string;
  id_token_expires_in: number;
  not_before: number;
  profile_info: string;
  refresh_token: string;
  refresh_token_expires_in: number; // epoch time. ex. 1209600 = 14days
  refresh_token_expires_on: number; // (now + refresh_token_expires_in) epoch time
  resource: string;
  scope: string;
  token_type: string;
};

export type UserInfoInToken = {
  id: string;
  idp?: string;
  idp_access_token?: string; //"ya29.a0ARrdaM-PF...", // social access_token
  mail?: string;
  givenName: string; //"tae-seong",
  surname: string; //"park", // family_name
  displayName: string; //"Mymymy", // Name
};

export type UserInfo = {
  '@odata.context': string; // "https://graph.microsoft.com/v1.0/$metadata#users/$entity",
  '@odata.id': string; // "https://graph.microsoft.com/v2/0687d16e-34c0-42a5-a38e-1f27686b3d69/directoryObjects/8a2c27a2-604d-4351-838a-27ff918e1a9b/Microsoft.DirectoryServices.User",
  businessPhones: string[]; //Array [],
  displayName: string; // "slackuser",
  givenName: string; // "tae-seong",
  id: string; // "8a2c27a2-604d-4351-838a-27ff918e1a9b",
  jobTitle: string; // null,
  mail: string; // null,
  mobilePhone: string; // null,
  officeLocation: string; // null,
  preferredLanguage: string; // null,
  surname: string; // "park",
  userPrincipalName: string; // "cpim_62fe4c8e-2557-4cfe-9168-ca1989410312@geoseong.onmicrosoft.com",
};

const SERVER_URL = 'https://hello-b2c-graph-api.azurewebsites.net/auth';

export default function App() {
  return (
    <ThemeProvider initialThemeType={'light'}>
      <SafeAreaView
        style={[
          styles.container,
          {
            paddingTop:
              Platform.OS === 'android' ? StatusBar.currentHeight : undefined,
          },
        ]}
      >
        <View style={{ flex: 10, alignSelf: 'stretch', paddingHorizontal: 60 }}>
          <UserFlow />
        </View>
      </SafeAreaView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGrp: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    padding: 10,
    backgroundColor: 'orange',
    borderRadius: 10,
  },
  webview: {
    borderColor: 'green',
    borderWidth: 2,
  },
});
