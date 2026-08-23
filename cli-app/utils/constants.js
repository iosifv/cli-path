export const AUTH0_CLIP_CLIENT_ID = 'CQYXLlHw2nZyrh61Z6srAkDO1Zi21tUS'
export const AUTH0_CLIP_URL = 'https://iosifv.eu.auth0.com/'
export const AUTH0_CLIP_URL_DEVICE_CODE = AUTH0_CLIP_URL + 'oauth/device/code'
export const AUTH0_CLIP_URL_TOKEN = AUTH0_CLIP_URL + 'oauth/token'
export const AUTH0_CLIP_URL_USERINFO = AUTH0_CLIP_URL + 'userinfo'
export const AUTH0_CLIP_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code'
export const AUTH0_CLIP_DEFAULT_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded' }

/**
 * Base URLs for the clip API, keyed by the persisted `application_environment`
 * setting. Replace the `vercel` value with your deployment URL after the first
 * `vercel deploy --prod`.
 *
 * Renaming a key here without adding a matching entry to LEGACY_ENVIRONMENTS in
 * lib/KeyManager.js yields `undefined + path` for anyone whose configstore
 * still holds the old value.
 */
export const CLIP_API_URL = {
  localhost: 'http://localhost:3000/api/',
  vercel: 'https://cli-path.vercel.app/api/',
}

/** Environment names offered by `clip config`. */
export const CLIP_ENVIRONMENTS = Object.keys(CLIP_API_URL)
