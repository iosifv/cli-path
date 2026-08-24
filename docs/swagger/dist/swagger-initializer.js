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
    // Default would compute `.../oauth2-redirect.html` next to this page; the
    // file actually ships one level down, inside dist/. Wrong value here 404s
    // the OAuth popup's callback, whether triggered manually or below.
    oauth2RedirectUrl: new URL('dist/oauth2-redirect.html', window.location.href).toString(),
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

  // Auto-runs the same steps as clicking "Authorize" -> "auth0" -> "Authorize",
  // so a visitor never has to find the button themselves. It can't fire on
  // load: browsers block window.open() popups that aren't a direct result of
  // a user gesture, and Auth0's popup needs one. Instead it piggybacks on the
  // visitor's first click anywhere on the page (expanding an endpoint counts).
  // If they already have an Auth0 session in this browser (e.g. from the
  // CLI's device flow), the popup completes silently with no login screen.
  document.addEventListener(
    'click',
    function autoAuthorize() {
      var topButton = document.querySelector('.auth-wrapper .btn.authorize')
      if (!topButton) return
      topButton.click()

      // The modal renders async; poll briefly for the auth0 scheme's own
      // "Authorize" button rather than the bearerAuth tab's.
      var attempts = 0
      var poll = setInterval(function () {
        attempts++
        var blocks = document.querySelectorAll('.dialog-ux .auth-container')
        for (var i = 0; i < blocks.length; i++) {
          if (/\bauth0\b/i.test(blocks[i].querySelector('h4, .oauth2-name')?.textContent || '')) {
            var scopeBtn = blocks[i].querySelector('button.btn.authorize, button.modal-btn')
            if (scopeBtn) {
              scopeBtn.click()
              clearInterval(poll)
              return
            }
          }
        }
        if (attempts > 20) clearInterval(poll)
      }, 100)
    },
    { once: true }
  )

  //</editor-fold>
};
