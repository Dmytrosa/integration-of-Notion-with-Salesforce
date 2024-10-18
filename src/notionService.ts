import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import { Field } from 'jsforce';
import { mapSalesforceFieldTypeToNotionPropertyType, mapSalesforceFieldToNotionProperty } from './fieldMapping';
import fs from 'fs';
import path from 'path';
import logger from './logger';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Load database mappings from databases.json
const databasesFilePath = path.join(__dirname, '../databases.json');
let databases: { [key: string]: string } = {};

if (fs.existsSync(databasesFilePath)) {
  const data = fs.readFileSync(databasesFilePath, 'utf-8');
  databases = JSON.parse(data);
}

// Function to get database ID for a Salesforce object
export function getDatabaseId(objectName: string): string | null {
  return databases[objectName] || null;
}

// Function to save database ID for a Salesforce object
export function saveDatabaseId(objectName: string, databaseId: string) {
  databases[objectName] = databaseId;
  fs.writeFileSync(databasesFilePath, JSON.stringify(databases, null, 2));
}

// Function to create a new Notion database
export async function createNotionDatabase(
  objectName: string,
  fields: Field[],
  parentPageId: string
): Promise<string> {
  // Define properties based on Salesforce fields
  const properties: { [key: string]: any } = {};

  fields.forEach((field) => {
    const notionPropertyType = mapSalesforceFieldTypeToNotionPropertyType(field);
    properties[field.label] = notionPropertyType;
  });

  // Ensure the 'Name' property exists
  if (!properties['Name']) {
    properties['Name'] = { title: {} };
  }

  // Add 'Salesforce ID' property
  properties['Salesforce ID'] = { rich_text: {} };

  // Create the database
  const response = await notion.databases.create({
    parent: { page_id: parentPageId },
    title: [
      {
        type: 'text',
        text: {
          content: objectName,
        },
      },
    ],
    properties: properties,
  });

  logger.info(`Created Notion database for ${objectName}: ${response.id}`);

  return response.id;
}

// Function to retrieve the database schema
export async function getDatabaseSchema(databaseId: string) {
  const response = await notion.databases.retrieve({ database_id: databaseId });
  return response.properties;
}

// Function to identify missing properties
export function identifyMissingProperties(
  existingProperties: { [key: string]: any },
  requiredProperties: string[]
) {
  const missingProperties = requiredProperties.filter(
    (prop) => !existingProperties.hasOwnProperty(prop)
  );
  return missingProperties;
}

// Function to add properties to the database schema
export async function addPropertiesToDatabase(
  databaseId: string,
  propertiesToAdd: { [key: string]: any }
) {
  await notion.databases.update({
    database_id: databaseId,
    properties: propertiesToAdd,
  });
}

// Function to find a Notion page by Salesforce ID
export async function findNotionPageBySalesforceId(
  databaseId: string,
  salesforceId: string
): Promise<string | null> {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Salesforce ID',
      rich_text: {
        equals: salesforceId,
      },
    },
  });

  if (response.results.length > 0) {
    return response.results[0].id;
  } else {
    return null;
  }
}

// Function to insert or update a record in Notion
export async function insertOrUpdateRecordInNotion(
  record: any,
  fields: Field[],
  databaseId: string
) {
  // Fetch current database schema
  const existingProperties = await getDatabaseSchema(databaseId);

  // Prepare the properties to insert or update
  const properties: any = {};

  // Collect required property names
  const requiredPropertyNames: string[] = [];

  fields.forEach((field) => {
    const fieldName = field.name;
    const fieldLabel = field.label;
    const value = record[fieldName];
    if (value !== undefined && value !== null) {
      requiredPropertyNames.push(fieldLabel);
      const notionProperty = mapSalesforceFieldToNotionProperty(field, value);
      if (notionProperty !== null) {
        properties[fieldLabel] = notionProperty;
      }
    }
  });

  // Ensure 'Salesforce ID' property is included
  if (!properties['Salesforce ID']) {
    properties['Salesforce ID'] = {
      rich_text: [
        {
          text: {
            content: record.Id,
          },
        },
      ],
    };
  }

  // Identify missing properties
  const missingPropertiesNames = identifyMissingProperties(
    existingProperties,
    requiredPropertyNames
  );

  // Define the properties to add
  const propertiesToAdd: { [key: string]: any } = {};

  missingPropertiesNames.forEach((propName) => {
    const field = fields.find((f) => f.label === propName);
    const notionPropertyType =
      field && mapSalesforceFieldTypeToNotionPropertyType(field);
    propertiesToAdd[propName] = notionPropertyType;
  });

  // Update the database schema if there are missing properties
  if (Object.keys(propertiesToAdd).length > 0) {
    logger.info(
      `Adding ${Object.keys(propertiesToAdd).length} new properties to the database schema.`
    );
    await addPropertiesToDatabase(databaseId, propertiesToAdd);
    logger.info('Database schema updated successfully.');
  }

  // Ensure the 'Name' property is set, as Notion requires a title property
  if (!properties['Name']) {
    properties['Name'] = {
      title: [
        {
          text: {
            content: record.Name || 'Untitled',
          },
        },
      ],
    };
  } else if (!properties['Name'].title) {
    // Adjust 'Name' property to be the title
    properties['Name'] = {
      title: properties['Name'].rich_text,
    };
  }

  // Check if the page already exists in Notion
  const pageId = await findNotionPageBySalesforceId(databaseId, record.Id);

  if (pageId) {
    // Update existing page
    await notion.pages.update({
      page_id: pageId,
      properties: properties,
    });
    logger.info(`Updated Notion page for Salesforce ID ${record.Id}`);
  } else {
    // Create new page
    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: properties,
    });
    logger.info(`Created Notion page for Salesforce ID ${record.Id}`);
  }
}
