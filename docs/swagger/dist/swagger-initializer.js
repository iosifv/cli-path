window.onload = function () {
  //<editor-fold desc="Changeable Configuration Block">

  // the following lines will be replaced by docker/configurator, when it runs in a docker-container
  window.ui = SwaggerUIBundle({
    url: 'https://raw.githubusercontent.com/iosifv/cli-path/main/postman/schemas/index.yaml',
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: 'StandaloneLayout',
  });

  // Prefills the "Authorize" dialog's auth0 (OAuth2) tab with the same public
  // client_id the CLI uses (cli-app/utils/constants.js). PKCE means no client
  // secret is needed. The API only forwards the resulting token to Auth0
  // /userinfo (vercel-api/lib/auth0.ts), so this token works interchangeably
  // with one pasted into the bearerAuth tab.
  window.ui.initOAuth({
    clientId: 'CQYXLlHw2nZyrh61Z6srAkDO1Zi21tUS',
    scopes: 'openid profile',
    usePkceWithAuthorizationCodeGrant: true,
  });

  //</editor-fold>
};
