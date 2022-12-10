import { CLIP_SLS_API } from '../../utils/constants.js'
import { KeyManager } from '../KeyManager.js'
const keyManager = new KeyManager()

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

    await fetch(CLIP_SLS_API + 'direction', options)
      .then((response) => response.json())
      .then((response) => console.log(response))
      .catch((err) => console.error(err))
  }

  async location(query) {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query }),
    }

    return await fetch(CLIP_SLS_API + 'location', options)
      .then((response) => response.json())
      .then((response) => response.data)
      .catch((err) => console.error(err))
  }
}
