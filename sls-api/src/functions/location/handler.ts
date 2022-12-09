import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { middyfy } from '@libs/lambda'
import { Client } from '@googlemaps/google-maps-services-js'
import * as dotenv from 'dotenv'

import schema from './schema'

dotenv.config()

const location: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  const client = new Client({})

  const locationResult = await client
    .findPlaceFromText({
      params: {
        input: event.body.query,
        inputtype: `textquery`,
        fields: ['formatted_address'],
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    })
    .then((res) => {
      return res.data.candidates[0].formatted_address
    })
    .catch((e) => {
      console.log(e)
    })

  return formatJSONResponse({
    message: 'Success!',
    locationResult,
  })
}

export const main = middyfy(location)
