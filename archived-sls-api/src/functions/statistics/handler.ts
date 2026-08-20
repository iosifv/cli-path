import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { middyfy } from '@libs/lambda'
import * as dotenv from 'dotenv'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

import schema from './schema'
import { TABLE_NAME_USAGE_LOG } from '@utils/constants'

dotenv.config()

const client = new DynamoDBClient()
const dynamoDbClient = DynamoDBDocumentClient.from(client)

const statistics: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const params = {
    TableName: TABLE_NAME_USAGE_LOG,
  }

  return await dynamoDbClient
    .send(new ScanCommand(params))

    .then((res) => {
      return formatJSONResponse({
        message: 'Success!',
        count: res.Count,
        items: res.Items,
      })
    })

    .catch((e) => {
      return formatJSONError({
        message: 'Error',
        status: e.status,
        status_code: e.code,
        error: e,
      })
    })
}

export const main = middyfy(statistics)
