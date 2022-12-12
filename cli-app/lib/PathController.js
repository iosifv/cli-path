import { KeyManager, KEY_NAME_ENGINE } from './KeyManager.js'
import { ClipClient } from './clients/ClipApi.js'
import { GoogleClient } from './clients/GoogleApi.js'
const keyManager = new KeyManager()

export class PathController {
  constructor() {
    switch (keyManager.get(KEY_NAME_ENGINE)) {
      case 'clip':
        this.engine = new ClipClient()
        break
      case 'google':
        this.engine = new GoogleClient()
        break

      default:
        throw new Error('No path engine is defined')
        break
    }
  }

  async location(query) {
    return await this.engine.location(query)
  }

  async direction(origin, destination) {
    return await this.engine.direction(origin, destination)
  }
}
