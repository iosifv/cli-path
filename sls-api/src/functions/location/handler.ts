import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { middyfy } from '@libs/lambda'
import { Client, PlaceInputType } from '@googlemaps/google-maps-services-js'
import * as dotenv from 'dotenv'
import { increaseMonthlyCount } from './../../libs/call-counter'
import schema from './schema'

dotenv.config()

const location: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const client = new Client({})

  increaseMonthlyCount(event)

  return await client
    .findPlaceFromText({
      params: {
        input: event.body.query,
        inputtype: PlaceInputType.textQuery,
        fields: ['formatted_address'],
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    })
    .then((res) => {
      if (res.data.status != 'OK') {
        return formatJSONError({
          message: 'Error',
          status: res.status,
          status_code: res.data.status,
          data: res.data,
        })
      }
      return formatJSONResponse({
        message: 'Success!',
        status: res.status,
        status_code: res.data.status,
        formatted_address: res.data.candidates[0].formatted_address,
      })
    })
    .catch((e) => {
      return formatJSONError({
        error: e.response,
      })
    })
}

export const main = middyfy(location)
