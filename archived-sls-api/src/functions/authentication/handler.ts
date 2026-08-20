import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse, formatJSONError } from '@libs/api-gateway'
import { Auth0Client } from '@libs/client-auth0'

import { middyfy } from '@libs/lambda'

import schema from './schema'

const authentication: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const client = new Auth0Client()
  const auth = await client.userinfo(event.headers.Authorization)
  if (auth.status != 200) {
    return formatJSONError(auth)
  }
  return formatJSONResponse(auth)
}

export const main = middyfy(authentication)
