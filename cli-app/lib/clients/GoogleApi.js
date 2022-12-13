import { Client } from '@googlemaps/google-maps-services-js'
import { KeyManager, ERROR_MESSAGE_NO_KEY, KEY_NAME_GOOGLE_TOKEN } from '../KeyManager.js'

const keyManager = new KeyManager()
let apiToken

export class GoogleClient {
  constructor() {
    this.client = new Client({})
    this.validateToken()
  }

  /**
   * Check if we have a valid token.
   * Save it in local variables if we do, or exit program if we don't
   */
  validateToken() {
    try {
      apiToken = keyManager.get(KEY_NAME_GOOGLE_TOKEN)
    } catch (error) {
      console.log(error.message)
      if (error.message === ERROR_MESSAGE_NO_KEY) {
        console.log(error)
        console.log('use "clip set key"')
      }
      process.exit(1)
    }
  }

  async direction(origin, destination) {
    return await this.client
      .directions({
        params: {
          origin: origin,
          destination: destination,
          key: apiToken,
        },
        timeout: 1000, // milliseconds
      })
      .then((res) => {
        // console.log(res.data.routes[0].legs[0])
        return {
          start: res.data.routes[0].legs[0].start_address,
          end: res.data.routes[0].legs[0].end_address,
          summary: res.data.routes[0].summary,
          distance: res.data.routes[0].legs[0].distance.text,
          duration: res.data.routes[0].legs[0].duration.text,
        }
      })
      .catch((e) => {
        // console.log(e)
        return {
          error: e.response.data,
        }
      })
  }

  async location(query) {
    return await this.client
      .findPlaceFromText({
        params: {
          input: query,
          inputtype: `textquery`,
          fields: ['formatted_address'],
          key: apiToken,
        },
      })
      .then((res) => {
        return res.data.candidates[0].formatted_address
      })
      .catch((e) => {
        // console.log(e)
        return {
          error: e.response.data,
        }
      })
  }
}
