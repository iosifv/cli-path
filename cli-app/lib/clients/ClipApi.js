import { KeyManager } from '../KeyManager.js'

const keyManager = new KeyManager()
let apiToken

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

    await fetch('http://localhost:3000/dev/direction', options)
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

    return await fetch('http://localhost:3000/dev/location', options)
      .then((response) => response.json())
      .then((response) => response.data)
      .catch((err) => console.error(err))
  }
}
