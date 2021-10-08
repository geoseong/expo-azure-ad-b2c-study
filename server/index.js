import {BearerStrategy} from 'passport-azure-ad';
import b2cApiConfig from './b2c_api_config.json';
import config from './config.json';
import cors from 'cors';
import express from 'express';
import fetch from 'node-fetch';
import morgan from 'morgan';
import passport from 'passport';

global.global_todos = [];

const options = {
    identityMetadata: `https://${config.credentials.tenantName}.b2clogin.com/${config.credentials.tenantName}.onmicrosoft.com/${config.policies.policyName}/${config.metadata.version}/${config.metadata.discovery}`,
    clientID: config.credentials.clientID,
    audience: config.credentials.clientID,
    policyName: config.policies.policyName,
    isB2C: config.settings.isB2C,
    validateIssuer: config.settings.validateIssuer,
    loggingLevel: config.settings.loggingLevel,
    passReqToCallback: config.settings.passReqToCallback
}

const bearerStrategy = new BearerStrategy(options, (token, done) => {
    // Send user info using the second argument
    done(null, { }, token);
});

const app = express();

app.use(express.json()); 

//enable CORS (for testing only -remove in production/deployment)
app.use(cors({
    origin: '*'
}));

app.use(morgan('dev'));

app.use(passport.initialize());

passport.use(bearerStrategy);

// API endpoint
app.get('/hello',
    passport.authenticate('oauth-bearer', {session: false}),
    (req, res) => {
        console.log('Validated claims: ', req.authInfo);
        res.status(200).json({'name': req.authInfo});
    }
);

// API endpoint
app.get('/auth',
    passport.authenticate('oauth-bearer', {session: false}),
    async (req, res) => {
        /*
        [response] req.authInfo:
        {
            iss: 'https://geoseong.b2clogin.com/0687d16e-34c0-42a5-a38e-1f27686b3d69/v2.0/',
            exp: 1633337535,
            nbf: 1633333935,
            aud: '53be8970-3d57-4484-8712-defdf11e9f48',
            idp_access_token: 'ya29.a0ARrdaM-nHaw...',
            given_name: 'tae-seong',
            family_name: 'park',
            name: '00tttaaaeeessseee',
            idp: 'google.com',
            sub: '8a2c27a2-604d-4351-838a-27ff918e1a9b',
            tfp: 'B2C_1_geoseongapp_edit',
            nonce: 'defaultNonce',
            azp: '53be8970-3d57-4484-8712-defdf11e9f48',
            ver: '1.0',
            iat: 
        }
        */
        console.log('Validated claims:', req.authInfo.sub);
    
        // request Graph API with B2C
        const response = await fetch(b2cApiConfig.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 
                `client_id=${b2cApiConfig.clientID}` +
                `&scope=${b2cApiConfig.scope}` +
                `&client_secret=${b2cApiConfig.client_secret}` +
                `&grant_type=client_credentials`
        });
        /* [response] { token_type, expires_in, ext_expires_in, access_token } */
        const data = await response.json();

        /*        
        TODO: Save token when access_token has not expired
        */

        const tokenForUser = data.access_token;
        console.log('endpoint:', `https://graph.microsoft.com/v1.0/users/${req.authInfo.sub}`);
        
        try {
            const userInfo = await fetch(`https://graph.microsoft.com/v1.0/users/${req.authInfo.sub}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${tokenForUser}`
                },
            });
            const result = await userInfo.json();
            res.status(200).json({result});
        }
        catch (e) {
            res.status(500).json({error: e});
        }
    }
);

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log('Listening on port ' + port);
});
