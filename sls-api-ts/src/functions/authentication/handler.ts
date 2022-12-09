import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse, formatJSONError } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import axios from "axios";

import schema from './schema';

const authentication: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  
  // console.log(event.headers.Authorization)


  const options = {
    method: 'POST',
    url: 'https://iosifv.eu.auth0.com/userinfo',
    headers: {
      'Content-Type': 'application/json', 
      Authorization: event.headers.Authorization
    },
    data: {}
  };
  
  return await axios.request(options)
  .then(function (response) {
    // console.log(response.data);
    return formatJSONResponse({
      status: "Success!",
      data: response.data
    })
  }).catch(function (error) {

   console.log(error.response)
    
    return formatJSONError({
      status: error.response.statusText,
      data: {
        message: error.message,
        status: error.response.status,
      }
    })
  });

};

export const main = middyfy(authentication);
