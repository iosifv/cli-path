import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';

import schema from './schema';

const ping: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  let message = '0 No Pong :('
  console.log(event)
  if (event.body != null && 'ping' in event.body && event.body.ping == true) {
    message = '1 Pong!'
  }
  return formatJSONResponse({
    message: message,
  });
};

export const main = middyfy(ping);
