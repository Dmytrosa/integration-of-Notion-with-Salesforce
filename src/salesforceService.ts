import jsforce, { Field } from 'jsforce';
import dotenv from 'dotenv';
dotenv.config();

export const conn = new jsforce.Connection({
  oauth2: {
    loginUrl: 'https://login.salesforce.com',
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  },
});

export async function loginToSalesforce() {
  await conn.login(
    process.env.SALESFORCE_USERNAME || '',
    (process.env.SALESFORCE_PASSWORD || '') + (process.env.SALESFORCE_SECURITY_TOKEN || '')
  );
}

export async function getSalesforceRecords(
  objectName: string,
  fields: Field[],
  lastModifiedDate?: Date | null,
  justUpdate?: Boolean
): Promise<any[]> {
  const fieldNames = fields.map((field) => field.name);
  let query = `SELECT ${fieldNames.join(', ')} FROM ${objectName}`;

console.log(lastModifiedDate)

  if (justUpdate && lastModifiedDate) {
    const formattedDate = lastModifiedDate.toISOString();
    query += ` WHERE LastModifiedDate > ${formattedDate}`;
  }

  query += ` ORDER BY LastModifiedDate ASC`;

  const records = await conn.query<any>(query);
  return records.records;
}
