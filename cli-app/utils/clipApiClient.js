import { KeyManager, ERROR_MESSAGE_NO_KEY } from '../lib/KeyManager.js'

const keyManager = new KeyManager()
let apiToken

export class ClipClient {
  constructor() {
    // this.client = new Client({})
    // this.validateToken()
  }

  async direction(origin, destination) {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"origin":"Amsterdam","destination":"Berlin"}',
    }

    await fetch('http://localhost:3000/dev/direction', options)
      .then((response) => response.json())
      .then((response) => console.log(response))
      .catch((err) => console.error(err))
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
        console.log(e)
      })
  }
}
