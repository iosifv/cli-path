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
  //
  // The inner "Authorize" button (the one that actually calls window.open)
  // has to be clicked from within the *same* user-gesture task as the click
  // that triggered this, or the popup gets silently blocked. Chrome extends
  // that window across a short setTimeout/setInterval; Firefox does not - a
  // poll that finds the button 100ms later already runs outside a trusted
  // gesture there and window.open() is dropped with no error at all. A
  // MutationObserver's callback still runs inside the same task the DOM
  // mutation happened in, so it stays inside the gesture window everywhere.
  function findAuth0AuthorizeButton() {
    var blocks = document.querySelectorAll('.dialog-ux .auth-container')
    for (var i = 0; i < blocks.length; i++) {
      var heading = blocks[i].querySelector('h4')
      if (heading && /\bauth0\b/i.test(heading.textContent || '')) {
        return blocks[i].querySelector('button.btn.authorize')
      }
    }
    return null
  }

  document.addEventListener(
    'click',
    function autoAuthorize() {
      var topButton = document.querySelector('.auth-wrapper .btn.authorize')
      if (!topButton) return

      var already = findAuth0AuthorizeButton()
      if (already) {
        already.click()
        return
      }

      var observer = new MutationObserver(function () {
        var scopeBtn = findAuth0AuthorizeButton()
        if (scopeBtn) {
          observer.disconnect()
          scopeBtn.click()
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
      // Belt and suspenders: stop watching even if the modal never renders
      // (e.g. spec failed to load), so this doesn't run forever.
      setTimeout(function () {
        observer.disconnect()
      }, 5000)

      topButton.click()
    },
    { once: true }
  )

  //</editor-fold>
};
