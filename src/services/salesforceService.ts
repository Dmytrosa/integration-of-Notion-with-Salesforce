import jsforce, { Field } from "jsforce";
import dotenv from "dotenv";
import logger from "../logger";
dotenv.config();

export const conn = new jsforce.Connection({
  oauth2: {
    loginUrl: process.env.SALESFORCE_CONNECTION_URL,
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  },
});

// Log in to Salesforce
export async function loginToSalesforce() {
  await conn.login(
    process.env.SALESFORCE_USERNAME || "",
    (process.env.SALESFORCE_PASSWORD || "") +
      (process.env.SALESFORCE_SECURITY_TOKEN || "")
  );
}

// Retrieve records from Salesforce
export async function getSalesforceRecords(
  objectName: string,
  fields: Field[],
  justUpdate: Boolean,
  lastModifiedDate?: Date | null
): Promise<any[]> {
  const fieldNames = fields.map((field) => field.name);
  let query = `SELECT ${fieldNames.join(", ")} FROM ${objectName}`;

  if (justUpdate && lastModifiedDate) {
    const formattedDate = lastModifiedDate.toISOString();
    query += ` WHERE LastModifiedDate > ${formattedDate}`;
  }

  query += ` ORDER BY LastModifiedDate ASC`;

  const records = await conn.query<any>(query);
  return records.records;
}

// Upsert a Salesforce record
export async function upsertSalesforceRecord(
  objectName: string,
  recordData: any
) {
  const result = await conn.sobject(objectName).upsert(recordData, "Id");
  logger.info(`Upserted record in Salesforce: ${result}`);
}
