import { assert } from 'chai'
import { KeyManager, STORE_NAME } from '../lib/KeyManager.js'

describe('Basic application functions', function () {
  let keyManager
  beforeEach(async () => {
    keyManager = new KeyManager(STORE_NAME + '-test')
    keyManager.addLocation('test-name-1', 'test-full-address')
    keyManager.addLocation('test-name-2', 'test-full-address-duplicate')
    keyManager.addLocation('test-name-3', 'test-full-address-duplicate')
  })

  afterEach(function () {
    keyManager.purgeAll()
  })

  describe('Location', () => {
    it('Initilizes the location object correctly.', async () => {
      const locations = keyManager.getLocations()
      assert.isArray(locations)
    }),
      it('Adds new locations correctly.', async () => {
        keyManager.addLocation('test-name-4', 'test-full-new-address')
        const locations = keyManager.getLocations()
        assert.equal(locations.length, 4)
      }),
      it('Reads existing locations correctly.', async () => {
        const location2 = keyManager.getLocation('test-name-2')
        assert.equal(location2.name, 'test-name-2')
        assert.equal(location2.address, 'test-full-address-duplicate')
      }),
      it('Deletes existing locations correctly.', async () => {
        keyManager.deleteLocation('test-name-2')
        const locations = keyManager.getLocations()
        assert.equal(locations.length, 2)
      })
  })
})
