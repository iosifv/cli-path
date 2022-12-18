import middy from '@middy/core'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { Auth0Client } from '@libs/client-auth0'
import { formatJSONError } from './api-gateway'

const myMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent> => {
  let authResponse
  const before: middy.MiddlewareFn<APIGatewayProxyEvent> = async (request) => {
    const client = new Auth0Client()
    authResponse = await client.userinfo(request.event.headers.Authorization)

    // If there's an error we instantly return the error as JSON
    if (authResponse.status != 200) {
      return formatJSONError(authResponse)
    }
  }

  // const after: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  //   request
  // ): Promise<void> => {
  //   console.log(authResponse)
  // }

  return {
    before,
    // after,
  }
}

export default myMiddleware
