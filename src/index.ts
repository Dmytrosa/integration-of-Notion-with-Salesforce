import {
  insertOrUpdateRecordInNotion,
  getDatabaseId,
  createNotionDatabase,
  saveDatabaseId,
  syncNotionToSalesforce,
} from "./services/notionService";
import {
  getLastProcessedDate,
  setLastProcessedDate,
  connectMongoDB,
  getLastSyncedTime,
  setLastSyncedTime,
} from "./services/checkpointService";
import logger from "./logger";
import { Field } from "jsforce";
import { ACCOUNT, CONTACT, TASK } from "./constants/general";
import {
  conn,
  getSalesforceRecords,
  loginToSalesforce,
} from "./services/salesforceService";

async function processObject(objectName: string, parentPageId: string) {
  logger.info(`Processing Salesforce object: ${objectName}`);

  // Retrieve object metadata
  const meta = await conn.sobject(objectName).describe();
  const fields: Field[] = meta.fields;

  logger.info(
    `Retrieved ${fields.length} fields from Salesforce object ${objectName}`
  );

  // Get or create the Notion database
  let databaseId = getDatabaseId(objectName);
  let justUpdate = Boolean(databaseId);

  if (!databaseId) {
    logger.info(`No Notion database found for ${objectName}, creating one.`);
    databaseId = await createNotionDatabase(objectName, fields, parentPageId);
    saveDatabaseId(objectName, databaseId);
  }

  // Get the last processed date from MongoDB
  const lastProcessedDate = await getLastProcessedDate(objectName);
  logger.info(
    `Last processed ${objectName} modification date: ${
      lastProcessedDate || "None"
    }`
  );

  // Fetch records from Salesforce
  const records = await getSalesforceRecords(
    objectName,
    fields,
    justUpdate,
    lastProcessedDate
  );
  logger.info(
    `Fetched ${records.length} records from Salesforce object ${objectName}`
  );

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
      logger.error(
        `Error processing ${objectName} record ${record.Id}: ${error}`
      );
    }
  }

  // Update the last processed date in MongoDB
  if (maxModifiedDate) {
    await setLastProcessedDate(objectName, maxModifiedDate);
    logger.info(
      `Updated last processed date for ${objectName} to ${maxModifiedDate.toISOString()}`
    );
  }

  // Sync Notion changes back to Salesforce
  const lastNotionSyncTime =
    (await getLastSyncedTime(`NotionToSalesforce_${objectName}`)) ||
    "1970-01-01T00:00:00Z";
  await syncNotionToSalesforce(
    objectName,
    fields,
    databaseId,
    lastNotionSyncTime
  );
  await setLastSyncedTime(
    `NotionToSalesforce_${objectName}`,
    new Date().toISOString()
  );
  logger.info(`Synced changes from Notion to Salesforce for ${objectName}`);
}

async function main() {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    logger.info("Connected to MongoDB");

    // Log into Salesforce
    await loginToSalesforce();
    logger.info("Logged into Salesforce");

    // Define the parent page ID for Notion databases
    const parentPageId = process.env.NOTION_PARENT_PAGE_ID || "";

    // List of Salesforce objects to process
    // Do Not rename
    const objectsToProcess = [CONTACT, ACCOUNT, TASK];

    // Process each object
    for (const objectName of objectsToProcess) {
      await processObject(objectName, parentPageId);
    }

    logger.info("Bi-directional synchronization completed successfully");
  } catch (error) {
    logger.error(`Error during synchronization: ${error}`);
    process.exit(1);
  } finally {
    // Optional: Close MongoDB connection if necessary
  }
}

main();
