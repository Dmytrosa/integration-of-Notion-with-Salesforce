import {
    conn,
    loginToSalesforce,
    getSalesforceContacts,
  } from './salesforceService';
  import {
    insertContactIntoNotion,
  } from './notionService';
  import {
    getLastProcessedId,
    setLastProcessedId,
    connectMongoDB,
  } from './checkpointService';
  import logger from './logger';
  import { Field } from 'jsforce';
  
  async function processContacts() {
    // Ensure that we have already logged into Salesforce before calling this function
    logger.info('Describing Salesforce Contact object to retrieve metadata');
  
    // Retrieve the metadata for the Contact object
    const meta = await conn.sobject('Contact').describe();
    const fields: Field[] = meta.fields;
  
    logger.info(`Retrieved ${fields.length} fields from Salesforce Contact object`);
  
    // Fetch all contacts from Salesforce
    const contacts = await getSalesforceContacts(fields);
    logger.info(`Fetched ${contacts.length} contacts from Salesforce`);
  
    // Get the last processed contact ID from MongoDB to resume processing
    const lastProcessedId = await getLastProcessedId('Contact');
    logger.info(`Last processed Contact ID: ${lastProcessedId || 'None'}`);
  
    let startProcessing = !lastProcessedId;
    for (const contact of contacts) {
      if (!startProcessing) {
        if (contact.Id === lastProcessedId) {
          startProcessing = true;
          continue; // Skip the last processed ID to avoid duplication
        }
        continue;
      }
  
      try {
        await insertContactIntoNotion(contact, fields);
        logger.info(`Inserted Contact ${contact.Id} into Notion`);
  
        // Update the last processed ID in MongoDB
        await setLastProcessedId('Contact', contact.Id);
      } catch (error) {
        logger.error(`Error inserting Contact ${contact.Id} into Notion: ${error}`);
        // Optionally, you can decide whether to continue processing or exit
        // For this script, we'll continue processing the next contact
      }
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
  
      // Process contacts
      await processContacts();
  
      logger.info('Migration completed successfully');
    } catch (error) {
      logger.error(`Error during migration: ${error}`);
      process.exit(1);
    } finally {
      // Close MongoDB connection if necessary
    }
  }
  
  main();
  