import { CLIP_SLS_API_URL } from '../../utils/constants.js'
import { KeyManager, KEY_NAME_ENVIRONMENT } from '../KeyManager.js'

const keyManager = new KeyManager()

export function getClipUrl(path) {
  return CLIP_SLS_API_URL[keyManager.get(KEY_NAME_ENVIRONMENT)] + path
}

export class ClipClient {
  constructor() {
    // Todo: maybe validate tokens?
  }

  async direction(origin, destination) {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: origin, destination: destination }),
    }

    console.log(options)
    await fetch(getClipUrl('direction'), options)
      .then((response) => {
        console.log(12312)
        console.log(response)
        return response.json()
      })
      .then((response) => console.log(response))
      .catch((err) => console.error(err))
  }

  async location(query) {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query }),
    }

    return await fetch(getClipUrl('location'), options)
      .then((response) => response.json())
      .then((response) => response.data)
      .catch((err) => console.error(err))
  }
}
