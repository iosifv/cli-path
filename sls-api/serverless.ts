import type { AWS } from '@serverless/typescript'
import healthcheck from '@functions/healthcheck'
import authentication from '@functions/authentication'
import direction from '@functions/direction'
import location from '@functions/location'
import statistics from '@functions/statistics'
// import { Table } from '@aws-cdk/aws-dynamodb'
import {
  TABLE_NAME_USAGE_LOG,
  // TABLE_NAME_MONTHLY_COUNTER
} from '@utils/constants'
// import { BillingMode } from '@aws-sdk/client-dynamodb'

const serverlessConfiguration: AWS = {
  service: 'clip-sls-api-2024',
  frameworkVersion: '3',
  plugins: ['serverless-offline', 'serverless-esbuild', 'serverless-dotenv-plugin'],
  useDotenv: true,
  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    // Todo:
    // stage: ${opt:stage, 'dev'}
    // region: ${opt:region, 'us-east-2'}
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
    },
    // Todo: update the resource like this:  "arn:aws:dynamodb:${self:provider.region}:*:table/${self:provider.environment.POSTS_TABLE}"
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: 'dynamodb:Scan',
        Resource: 'arn:aws:dynamodb:us-east-1:*:table/ClipTable-UsageLog',
      },
    ],
  },
  // import the function via paths
  functions: {
    healthcheck,
    authentication,
    direction,
    location,
    statistics,
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      // exclude: ['aws-sdk'],
      target: 'node18',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
    dotenv: {
      required: ['GOOGLE_MAPS_API_KEY'],
    },
  },
  resources: {
    Resources: {
      // Define your DynamoDB table here
      ResourceNameClipUsageLog: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: TABLE_NAME_USAGE_LOG,
          AttributeDefinitions: [
            {
              AttributeName: 'User',
              AttributeType: 'S',
            },
            {
              AttributeName: 'CreatedAt',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'User', // Partition key
              KeyType: 'HASH',
            },
            {
              AttributeName: 'CreatedAt', // Sort key
              KeyType: 'RANGE',
            },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 2,
            WriteCapacityUnits: 1,
          },
          // Add more properties as needed, such as BillingMode, etc.
        },
      },
      // ResourceNameClipMonthlyCounter: {
      //   Type: 'AWS::DynamoDB::Table',
      //   Properties: {
      //     TableName: TABLE_NAME_MONTHLY_COUNTER,
      //     AttributeDefinitions: [
      //       {
      //         AttributeName: 'YearMonth',
      //         AttributeType: 'S',
      //       },
      //       {
      //         AttributeName: 'Counter',
      //         AttributeType: 'N',
      //       },
      //     ],
      //     KeySchema: [
      //       {
      //         AttributeName: 'YearMonth', // Partition key
      //         KeyType: 'HASH',
      //       },
      //       {
      //         AttributeName: 'Counter', // Partition key
      //         KeyType: 'RANGE',
      //       },
      //     ],
      //     ProvisionedThroughput: {
      //       ReadCapacityUnits: 2,
      //       WriteCapacityUnits: 1,
      //     },
      //     // Add more properties as needed, such as BillingMode, etc.
      //   },
      // },
    },
  },
}

module.exports = serverlessConfiguration
