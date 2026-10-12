const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function init() {
  // Step A: Connect to default postgres DB to create helpdesk_db
  const defaultClient = new Client({
    connectionString: "postgres://postgres:Ritik@98080@localhost:5432/postgres",
  });

  try {
    await defaultClient.connect();
    const res = await defaultClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'helpdesk_db'",
    );
    if (res.rowCount === 0) {
      await defaultClient.query("CREATE DATABASE helpdesk_db");
      console.log("Database helpdesk_db created successfully!");
    } else {
      console.log("Database helpdesk_db already exists.");
    }
  } catch (err) {
    console.error("Error creating database:", err.message);
  } finally {
    await defaultClient.end();
  }

  // Step B: Connect to helpdesk_db and run schema.sql
  const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await dbClient.connect();
    const schemaSql = fs.readFileSync(
      path.join(__dirname, "db", "schema.sql"),
      "utf8",
    );
    await dbClient.query(schemaSql);
    console.log("All tables created successfully from schema.sql!");
  } catch (err) {
    console.error("Error executing schema.sql:", err.message);
  } finally {
    await dbClient.end();
  }
}

init();
