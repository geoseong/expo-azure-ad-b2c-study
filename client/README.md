# Azure-expo-study

## Azure AD B2C Resource Setting

1. [테넌트 만들기](https://geoseong.notion.site/7a48654a62e74287bd781fe36d040010)
2. [웹 어플리케이션 등록](https://geoseong.notion.site/b3af7db8509242e985c6a406e8957c04)
3. [ID Provider 세팅](https://geoseong.notion.site/ID-Provider-eeb6945089034d88814ba356cfbbfa58)
4. [사용자 흐름 세팅](https://geoseong.notion.site/ab456d95dd5a4ee29cffc05243f349db)

## Prerequisite

Copy config.template.json to config.json

```sh
cp config.template.json config.json
```

and fill the informations of your azure B2C application in `config.json`

```json
{
  "STORAGE_KEY_TOKEN": "[name(key) of localstorage or AsyncStorage]",
  "AZURE_INITIAL_DOMAIN_NAME": "[azure_initial_domain_name ex) 'geoseong'.onmicrosoft.com]",
  "AZURE_POLICY_SIGNIN_NAME": "[signin userflow's name]",
  "AZURE_POLICY_EDIT_NAME": "[useredit userflow's name]",
  "AZURE_CLIENT_ID": "[application(client)_id]",
  "AZURE_TENANT_ID": "[tenant_id]",
  "CUSTOM_B2C_API_URI": "[Custom Azure AppEngine's endpoint]"
}
```

fill `name`, `scheme`, `slug`, `bundleIdentifier` in ios, `package` in android, at [`app.config.ts`](./app.config.ts)

```javascript
export default {
  expo: {
    name: '[fill it!]',
    version: '1.0.0',
    scheme: '[fill it!]',
    slug: '[fill it!]',
    ios: {
      bundleIdentifier: '[fill it!]',
      buildNumber: '1.0.0',
    },
    android: {
      package: '[fill it!]',
      versionCode: 1,
    },
  },
};

```

Install dependencies

```sh
yarn
```

## Getting Started

```sh
yarn start
```
