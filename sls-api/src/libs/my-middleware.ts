import middy from '@middy/core'
// import { canPrefetch, getInternal, processCache } from '@middy/util'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { Auth0Client } from '@libs/client-auth0'
import { formatJSONError } from './api-gateway'
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import {
  MAXIMUM_ALLOWED_MONTHLY_GOOGLE_DIRECTION_CALLS,
  TABLE_NAME_USAGE_LOG,
} from '@utils/constants'

import { DynamoDB } from 'aws-sdk'
// Create DynamoDB service object
const dynamoDB = new DynamoDB()

async function getMonthlyCount(): Promise<number> {
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1 // Months are 0-based, so adding 1
  const currentYear = currentDate.getFullYear()
  let beginFilter: string
  if (currentMonth < 10) {
    beginFilter = `${currentYear}-0${currentMonth}`
  } else {
    beginFilter = `${currentYear}-${currentMonth}`
  }

  const params: DynamoDB.ScanInput = {
    TableName: TABLE_NAME_USAGE_LOG,
    FilterExpression: 'begins_with(CreatedAt, :prefix)',
    ExpressionAttributeValues: {
      ':prefix': { S: beginFilter },
    },
  }

  try {
    const data = await dynamoDB.scan(params).promise()
    return data.Count || 0 // Return 0 if Count is undefined
  } catch (error) {
    console.error('Unable to scan the table. Error:', error)
    return 0 // Return 0 if there's an error
  }
}

const myMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent> => {
  let authResponse
  const before: middy.MiddlewareFn<APIGatewayProxyEvent> = async (request) => {
    const client = new Auth0Client()
    authResponse = await client.userinfo(request.event.headers.Authorization)

    // If there's an error we instantly return the error as JSON
    if (authResponse.status != 200) {
      return formatJSONError(authResponse)
    }

    // Save the user's information so that we can use it later for analytics
    Object.assign(request.event, { user: authResponse.data })

    // Check if we have too many requests already
    const monthlyCount = await getMonthlyCount()

    if (monthlyCount > MAXIMUM_ALLOWED_MONTHLY_GOOGLE_DIRECTION_CALLS) {
      return formatJSONError({
        message: 'This service has reached the free quota for this month.',
        error: {
          max_calls: MAXIMUM_ALLOWED_MONTHLY_GOOGLE_DIRECTION_CALLS,
          total_calls: monthlyCount,
        },
      })
    }
  }

  // const after: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  //   request
  // ): Promise<void> => {
  //   console.log(authResponse)
  // }

  return {
    before,
    g,
    // after,
  }
}

export default myMiddleware
