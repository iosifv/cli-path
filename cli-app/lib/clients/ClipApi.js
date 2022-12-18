import { CLIP_SLS_API_URL } from '../../utils/constants.js'
import { KeyManager, KEY_NAME_AUTH0_ACCESS_TOKEN, KEY_NAME_ENVIRONMENT } from '../KeyManager.js'
import axios from 'axios'

const keyManager = new KeyManager()

function getClipUrl(path) {
  return CLIP_SLS_API_URL[keyManager.get(KEY_NAME_ENVIRONMENT)] + path
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

export class ClipClient {
  constructor() {
    // Todo: maybe validate tokens?
  }

  async direction(origin, destination) {
    return await axios
      .request(buildClipOptions('direction', { origin: origin, destination: destination }))
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
    return await axios
      .request(buildClipOptions('location', { query: query }))
      .then((response) => {
        if (response.data.status_code != 'OK') {
          console.error(response.data)
          process.exit(0)
        }
        return response.data.formatted_address
      })
      .catch((error) => {
        console.error(error)
        process.exit(0)
      })
  }
}
