import {
  conn,
  loginToSalesforce,
  getSalesforceRecords,
} from './salesforceService';
import {
  insertOrUpdateRecordInNotion,
  getDatabaseId,
  createNotionDatabase,
  saveDatabaseId,
} from './notionService';
import {
  getLastProcessedDate,
  setLastProcessedDate,
  connectMongoDB,
} from './checkpointService';
import logger from './logger';
import { Field } from 'jsforce';

async function processObject(objectName: string, parentPageId: string) {
  logger.info(`Processing Salesforce object: ${objectName}`);

  // Retrieve the metadata for the object
  const meta = await conn.sobject(objectName).describe();
  const fields: Field[] = meta.fields;

  logger.info(`Retrieved ${fields.length} fields from Salesforce object ${objectName}`);

  // Get or create the Notion database
  let databaseId = getDatabaseId(objectName);
  let justUpdate = Boolean(databaseId) 

  if (!databaseId) {
    logger.info(`No Notion database found for ${objectName}, creating one.`);
    databaseId = await createNotionDatabase(objectName, fields, parentPageId);
    saveDatabaseId(objectName, databaseId);
  }

  // Get the last processed date from MongoDB to resume processing
  const lastProcessedDate = await getLastProcessedDate(objectName);
  logger.info(`Last processed ${objectName} modification date: ${lastProcessedDate || 'None'}`);

  // Fetch records from Salesforce
  const records = await getSalesforceRecords(objectName, fields, lastProcessedDate, justUpdate);
  logger.info(`Fetched ${records.length} records from Salesforce object ${objectName}`);

  // Initialize maxModifiedDate
  let maxModifiedDate: Date | null = lastProcessedDate;

  // Process each record
  for (const record of records) {
    try {
      await insertOrUpdateRecordInNotion(record, fields, databaseId);
      logger.info(`Processed ${objectName} record ${record.Id}`);

      // Update maxModifiedDate
      const recordModifiedDate = new Date(record.LastModifiedDate);
      if (!maxModifiedDate || recordModifiedDate > maxModifiedDate) {
        maxModifiedDate = recordModifiedDate;
      }
    } catch (error) {
      logger.error(`Error processing ${objectName} record ${record.Id}: ${error}`);
      // Optionally, continue processing or handle the error as needed
    }
  }

  // After processing all records, update the last processed date in MongoDB
  if (maxModifiedDate) {
    await setLastProcessedDate(objectName, maxModifiedDate);
    logger.info(`Updated last processed date for ${objectName} to ${maxModifiedDate.toISOString()}`);
  }
}

async function main() {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    logger.info('Connected to MongoDB');

    // Log into Salesforce
    await loginToSalesforce();
    logger.info('Logged into Salesforce');

    // Define the parent page ID where databases will be created
    const parentPageId = process.env.NOTION_PARENT_PAGE_ID || '';

    // List of Salesforce objects to process
    const objectsToProcess = ['Contact', 'Task']; // Add more objects as needed

    // Process each object
    for (const objectName of objectsToProcess) {
      await processObject(objectName, parentPageId);
    }

    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error(`Error during migration: ${error}`);
    process.exit(1);
  } finally {
    // Close MongoDB connection if necessary
  }
}

main();
