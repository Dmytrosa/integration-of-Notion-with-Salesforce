import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import { Field } from "jsforce";
import {
  mapSalesforceFieldTypeToNotionPropertyType,
  mapSalesforceFieldToNotionProperty,
  mapNotionPropertyToSalesforceField,
} from "../fieldMapping";
import fs from "fs";
import path from "path";
import logger from "../logger";
import {
  CONTACT,
  LAST_SYNCED,
  NAME,
  SALESFORCE_ID,
} from "../constants/general";
import { upsertSalesforceRecord } from "./salesforceService";

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Load database mappings from databases.json
const databasesFilePath = path.join(__dirname, "../../databases.json");
let databases: { [key: string]: string } = {};

if (fs.existsSync(databasesFilePath)) {
  const data = fs.readFileSync(databasesFilePath, "utf-8");
  databases = JSON.parse(data);
}

// Get database ID for a Salesforce object
export function getDatabaseId(objectName: string): string | null {
  return databases[objectName] || null;
}

// Save database ID for a Salesforce object
export function saveDatabaseId(objectName: string, databaseId: string) {
  databases[objectName] = databaseId;
  fs.writeFileSync(databasesFilePath, JSON.stringify(databases, null, 2));
}

// Create a new Notion database
export async function createNotionDatabase(
  objectName: string,
  fields: Field[],
  parentPageId: string
): Promise<string> {
  // Define properties based on Salesforce fields
  const properties: { [key: string]: any } = {};

  fields.forEach((field) => {
    const notionPropertyType =
      mapSalesforceFieldTypeToNotionPropertyType(field);
    properties[field.label] = notionPropertyType;
  });

  // Ensure 'Name' and other properties exist
  if (!properties[NAME]) {
    properties[NAME] = { title: {} };
  }
  properties[SALESFORCE_ID] = { rich_text: {} };
  properties[LAST_SYNCED] = { date: {} };

  // Create the database
  const response = await notion.databases.create({
    parent: { page_id: parentPageId },
    title: [
      {
        type: "text",
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

// Retrieve the database schema
export async function getDatabaseSchema(databaseId: string) {
  const response = await notion.databases.retrieve({ database_id: databaseId });
  return response.properties;
}

// Identify missing properties in the database schema
export function identifyMissingProperties(
  existingProperties: { [key: string]: any },
  requiredProperties: string[]
) {
  const missingProperties = requiredProperties.filter(
    (prop) => !existingProperties.hasOwnProperty(prop)
  );
  return missingProperties;
}

// Add properties to the database schema
export async function addPropertiesToDatabase(
  databaseId: string,
  propertiesToAdd: { [key: string]: any }
) {
  await notion.databases.update({
    database_id: databaseId,
    properties: propertiesToAdd,
  });
}

// Find a Notion page by Salesforce ID
export async function findNotionPageBySalesforceId(
  databaseId: string,
  salesforceId: string
): Promise<string | null> {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: SALESFORCE_ID,
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

// Insert or update a record in Notion
export async function insertOrUpdateRecordInNotion(
  record: any,
  fields: Field[],
  databaseId: string
) {
  // Fetch current database schema
  const existingProperties = await getDatabaseSchema(databaseId);

  // Prepare the properties to insert or update
  const properties: any = {};
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

  // Ensure 'Salesforce ID' and 'Last Synced' properties are included
  properties[SALESFORCE_ID] = {
    rich_text: [
      {
        text: {
          content: record.Id,
        },
      },
    ],
  };
  properties[LAST_SYNCED] = {
    date: {
      start: new Date().toISOString(),
    },
  };

  // Identify and add missing properties to the database schema
  const missingPropertiesNames = identifyMissingProperties(
    existingProperties,
    requiredPropertyNames
  );
  const propertiesToAdd: { [key: string]: any } = {};

  missingPropertiesNames.forEach((propName) => {
    const field = fields.find((f) => f.label === propName);
    const notionPropertyType =
      field && mapSalesforceFieldTypeToNotionPropertyType(field);
    propertiesToAdd[propName] = notionPropertyType;
  });

  if (Object.keys(propertiesToAdd).length > 0) {
    logger.info(
      `Adding ${
        Object.keys(propertiesToAdd).length
      } new properties to the database schema.`
    );
    await addPropertiesToDatabase(databaseId, propertiesToAdd);
    logger.info("Database schema updated successfully.");
  }

  // Ensure the 'Name' property is set
  if (!properties[NAME]) {
    properties[NAME] = {
      title: [
        {
          text: {
            content: record.Name || "Untitled",
          },
        },
      ],
    };
  } else if (!properties[NAME].title) {
    properties[NAME] = {
      title: properties[NAME].rich_text,
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

// Get modified Notion pages since last sync
export async function getModifiedNotionPages(
  databaseId: string,
  lastSyncTime: string
): Promise<any[]> {
  const pages: any[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: startCursor,
      filter: {
        timestamp: "last_edited_time",
        last_edited_time: {
          after: lastSyncTime,
        },
      },
    });

    pages.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor || undefined;
  }

  return pages;
}

// Sync changes from Notion to Salesforce
export async function syncNotionToSalesforce(
  objectName: string,
  fields: Field[],
  databaseId: string,
  lastSyncTime: string
) {
  const modifiedPages = await getModifiedNotionPages(databaseId, lastSyncTime);

  for (const page of modifiedPages) {
    const properties = page.properties;
    const salesforceData: any = {};

    // Filter updateable fields
    const updateableFields = fields.filter((field) => field.updateable);

    updateableFields.forEach((field) => {
      const fieldLabel = field.label;
      const notionProperty = properties[fieldLabel];

      if (notionProperty) {
        const value = mapNotionPropertyToSalesforceField(field, notionProperty);
        if (value !== undefined && value !== null) {
          salesforceData[field.name] = value;
        }
      }
    });

    // Handle special case for 'Name' field on Contact
    if (objectName === CONTACT) {
      const nameProperty = properties[NAME];
      if (nameProperty) {
        const fullName = nameProperty.title?.[0]?.text?.content || "";
        const [firstName, ...lastNameParts] = fullName.split(" ");
        const lastName = lastNameParts.join(" ") || " ";
        salesforceData.FirstName = firstName;
        salesforceData.LastName = lastName || " ";
      }
    }

    // Include Salesforce ID for upsert
    if (properties[SALESFORCE_ID]) {
      const salesforceId =
        properties[SALESFORCE_ID].rich_text?.[0]?.text?.content;
      if (salesforceId) {
        salesforceData.Id = salesforceId;
      }
    }

    console.log(JSON.stringify(salesforceData));

    // Upsert record in Salesforce
    try {
      await upsertSalesforceRecord(objectName, salesforceData);
      logger.info(
        `Upserted Salesforce record ${salesforceData.Id || "New Record"}`
      );
    } catch (error) {
      logger.error(
        `Error upserting Salesforce record ${
          salesforceData.Id || "New Record"
        }: ${error}`
      );
    }
  }
}
