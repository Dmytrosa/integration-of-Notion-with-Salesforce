# Salesforce to Notion Migration Script

## Description

A Node.js script to migrate data from Salesforce to Notion, with progress tracking using MongoDB.

## Prerequisites

- Node.js v14 or higher
- npm
- MongoDB instance (local or cloud)
- Salesforce account with API access
  https://developer.salesforce.com/developer-centers/integration-apis
  https://www.youtube.com/watch?v=ppkyQkoetCE
  jsforce Library:
  Simplifies interaction with Salesforce.
  Documentation: jsforce Documentation

- Notion account with an internal integration
  https://developers.notion.com/
  @notionhq/client Library:
  Official Notion API client for Node.js.
  Documentation: Notion API Documentation

## Setup

1. Clone the Repository

```bash
git clone https://github.com/Dmytrosa/integration-of-Notion-with-Salesforce
cd testtaskNotion

2. Install Dependencies
npm install

3. Configure Environment Variables
SALESFORCE_USERNAME=
SALESFORCE_PASSWORD=
SALESFORCE_SECURITY_TOKEN=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
NOTION_TOKEN=
NOTION_CONTACTS_DATABASE_ID=
NOTION_ACCOUNTS_DATABASE_ID=
MONGODB_URI=

4. Run the Script
npm run build
npm run start
```
