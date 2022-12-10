import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { middyfy } from '@libs/lambda'
import { Client } from '@googlemaps/google-maps-services-js'
import * as dotenv from 'dotenv'

import schema from './schema'

dotenv.config()

const direction: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  const client = new Client({})

  const directionsResult = await client
    .directions({
      params: {
        origin: event.body.origin,
        destination: event.body.destination,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 1000, // milliseconds
    })
    .then((res) => {
      return {
        start: res.data.routes[0].legs[0].start_address,
        end: res.data.routes[0].legs[0].end_address,
        summary: res.data.routes[0].summary,
        distance: res.data.routes[0].legs[0].distance.text,
        duration: res.data.routes[0].legs[0].duration.text,
      }
    })
    .catch((e) => {
      console.log(e)
    })

  return formatJSONResponse({
    message: 'Success!',
    data: directionsResult,
  })
}

export const main = middyfy(direction)
