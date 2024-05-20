import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { TABLE_NAME_USAGE_LOG } from '@utils/constants'
import {} from '@aws-sdk/lib-dynamodb'

// const dynamoDbClient = new DynamoDBClient()
// const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient)

async function getMonthlyCount(): Promise<number> {
  const dynamoDbDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient())
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1 // Months are 0-based, so adding 1
  const currentYear = currentDate.getFullYear()
  let beginFilter: string
  if (currentMonth < 10) {
    beginFilter = `${currentYear}-0${currentMonth}`
  } else {
    beginFilter = `${currentYear}-${currentMonth}`
  }

  const params = {
    TableName: TABLE_NAME_USAGE_LOG,
    FilterExpression: 'begins_with(CreatedAt, :prefix)',
    ExpressionAttributeValues: {
      ':prefix': { S: beginFilter },
    },
  }

  try {
    const data = await dynamoDbDocumentClient.send(new ScanCommand(params))
    return data.Count || 0 // Return 0 if Count is undefined
  } catch (error) {
    console.error('Unable to scan the table. Error:', error)
    return 0 // Return 0 if there's an error
  }
}

async function increaseMonthlyCount(event) {
  const dynamoDbDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient())
  const timestamp = new Date().toISOString() // Convert Date to ISO string
  const params = {
    TableName: TABLE_NAME_USAGE_LOG,
    Item: {
      CreatedAt: timestamp,
      User: event.user.nickname,
      Data: event.body,
    },
  }

  try {
    await dynamoDbDocumentClient.send(new PutCommand(params))
  } catch (error) {
    console.log(error)
  }
}

export { getMonthlyCount, increaseMonthlyCount }
