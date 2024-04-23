import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { middyfy } from '@libs/lambda'
import { Client } from '@googlemaps/google-maps-services-js'
import * as dotenv from 'dotenv'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

import schema from './schema'

dotenv.config()
const USERS_TABLE = 'ClipUsageLog'
const client = new DynamoDBClient()
const dynamoDbClient = DynamoDBDocumentClient.from(client)

const direction: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const client = new Client({})

  const params = {
    TableName: USERS_TABLE,
    Item: {
      // userId: 100,
      User: 'test-from-local',
    },
  }

  try {
    await dynamoDbClient.send(new PutCommand(params))
    // res.json({ userId, name })
  } catch (error) {
    console.log(error)
    // res.status(500).json({ error: 'Could not create user' })
  }

  return await client
    .directions({
      params: {
        origin: event.body.origin,
        destination: event.body.destination,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 1000, // milliseconds
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
        direction: {
          start: res.data.routes[0].legs[0].start_address,
          end: res.data.routes[0].legs[0].end_address,
          summary: res.data.routes[0].summary,
          distance: res.data.routes[0].legs[0].distance.text,
          duration: res.data.routes[0].legs[0].duration.text,
        },
        // data: res.data,
      })
    })
    .catch((e) => {
      return formatJSONError({
        message: 'Error',
        status: e.status,
        status_code: e.code,
        // error: e,
      })
    })
}

export const main = middyfy(direction)
