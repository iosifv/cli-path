import { Client } from "@googlemaps/google-maps-services-js";
import { KeyManager, ERROR_MESSAGE_NO_KEY } from '../lib/KeyManager.js';


const keyManager = new KeyManager();
let apiToken;

export class MapsClient {
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
        apiToken = keyManager.getToken()
        } catch (error) {
        console.log(error.message)
        if (error.message === ERROR_MESSAGE_NO_KEY) {
            console.log('use "clip set key"')
        }
        process.exit(1)  
        }
    }

    async direction(origin, destination) {
        await this.client
            .directions({
                params: {
                    origin: origin,
                    destination: destination,
                    key: apiToken
                },
                timeout: 1000, // milliseconds
            })
            .then((res) => {
                console.log('Start:    ' + res.data.routes[0].legs[0].start_address)
                console.log('End:      ' + res.data.routes[0].legs[0].end_address)
                console.log('')
                console.log('Summary:  ' + res.data.routes[0].summary)
                console.log('Distance: ' + res.data.routes[0].legs[0].distance.text)
                console.log('Duration: ' + res.data.routes[0].legs[0].duration.text)
            })
            .catch((e) => {
                console.log(e)
                // console.log(e.response.data.error_message);
            });
    }

    async location(query) {
        return await this.client
            .findPlaceFromText({
                params: {
                    input: query,
                    inputtype: `textquery`,
                    fields: ['formatted_address'],
                    key: apiToken
                }
            })
            .then((res) => {
                // console.log(res.data)
                return res.data.candidates[0].formatted_address
            })
            .catch((e) => {
                console.log(e)
            })
    }
}

