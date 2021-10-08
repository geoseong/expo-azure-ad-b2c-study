# Azure-expo-study

## Prerequisite

Copy `config.template.json` to `config.json`

```sh
cp config.template.json config.json
```

and fill the informations of your azure B2C application in `config.json`

```json
{
    "credentials": {
        "tenantName": "[azure_initial_domain_name ex) 'geoseong'.onmicrosoft.com]",
        "clientID": "[application(client)_id]"
    },
    "policies": {
        "policyName": "[userflow_name]"
    },
    "resource": {
        "scope": ["[web-api's scope name]"]
    },
    "metadata": {
        "authority": "login.microsoftonline.com",
        "discovery": ".well-known/openid-configuration",
        "version": "v2.0"
    },
    "settings": {
        "isB2C": true,
        "validateIssuer": false,
        "passReqToCallback": false,
        "loggingLevel": "info"
    }
}
```

Copy `b2c_api_config.template.json` to `b2c_api_config.json`

```sh
cp config.template.json config.json
```

and fill the informations of your azure B2C application in `b2c_api_config.json`

```json
{
  "endpoint": "https://login.microsoftonline.com/[tenant-id]/oauth2/v2.0/token",
  "clientID": "[application(client)_id]",
  "scope": "https://graph.microsoft.com/.default",
  "client_secret": "[client-secret]"
}
```

Install dependencies

```sh
yarn
```

## Getting Started

```sh
yarn start
```

## How to deploy

[Visual Studio Code를 사용하여 Azure App Services에 Express.js 배포](https://docs.microsoft.com/ko-kr/azure/developer/javascript/tutorial/deploy-nodejs-azure-app-service-with-visual-studio-code?tabs=bash)