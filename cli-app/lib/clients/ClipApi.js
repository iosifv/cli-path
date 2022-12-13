import { CLIP_SLS_API_URL } from '../../utils/constants.js'
import { KeyManager, KEY_NAME_ENVIRONMENT } from '../KeyManager.js'
import axios from 'axios'

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
      url: getClipUrl('direction'),
      headers: { 'Content-Type': 'application/json' },
      data: { origin: origin, destination: destination },
    }

    return await axios
      .request(options)
      .then(function (response) {
        // console.log(response)
        if (response.data.status_code != 'OK') {
          console.error(response.data)
          process.exit(0)
        }
        return response.data.direction
      })
      .catch(function (error) {
        console.error(error.response.data)
        process.exit(0)
      })
  }

  async location(query) {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query }),
    }

    return await fetch(getClipUrl('location'), options)
      .then((response) => response.json())
      .then((response) => {
        if (response.status_code != 'OK') {
          console.log(response)
          process.exit(0)
        }
        return response.formatted_address
      })
      .catch((err) => {
        console.error(err)
        process.exit(0)
      })
  }
}
