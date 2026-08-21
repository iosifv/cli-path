import { CLIP_API_URL } from '../../utils/constants.js'
import { KeyManager, KEY_NAME_AUTH0_ACCESS_TOKEN, KEY_NAME_ENVIRONMENT } from '../KeyManager.js'
import * as print from '../../utils/style.js'
import axios from 'axios'

const keyManager = new KeyManager()

function getClipUrl(path) {
  return CLIP_API_URL[keyManager.get(KEY_NAME_ENVIRONMENT)] + path
}

export function buildClipOptions(path, data) {
  return {
    method: 'POST',
    url: getClipUrl(path),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + keyManager.get(KEY_NAME_AUTH0_ACCESS_TOKEN),
    },
    data: data,
  }
}

/**
 * Report a failed call and stop.
 *
 * The API answers with real HTTP status codes, so axios rejects on failure and
 * the body's `message` explains why. The previous implementation inspected
 * `response.data.status_code` instead, because the archived API returned HTTP
 * 401 for every failure class — that workaround is no longer needed.
 */
function reportAndExit(error) {
  if (error.response) {
    const body = error.response.data || {}
    print.error(body.message || `The clip API answered with HTTP ${error.response.status}.`)
    if (body.error) {
      console.log(body.error)
    }
  } else {
    print.error('Could not reach the clip API: ' + error.message)
  }

  process.exit(1)
}

export class ClipClient {
  constructor() {
    // Todo: maybe validate tokens?
  }

  async direction(origin, destination) {
    try {
      const response = await axios.request(
        buildClipOptions('direction', {
          origin: origin,
          destination: destination,
        })
      )
      return response.data.direction
    } catch (error) {
      reportAndExit(error)
    }
  }

  async location(query) {
    try {
      const response = await axios.request(buildClipOptions('location', { query: query }))
      return response.data.formatted_address
    } catch (error) {
      reportAndExit(error)
    }
  }
}
