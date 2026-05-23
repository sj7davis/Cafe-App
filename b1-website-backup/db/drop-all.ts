import mysql from "mysql2/promise";

async function dropAll() {
  const url = "mysql://25ZtvtPgjqsdp54.root:MLNcXmEVGf8dw6WR70tXbvQUrmasoBjT@ep-t4ni387b5e83b7519dc8.epsrv-t4n281l4mrmemi4zls9a.ap-southeast-1.privatelink.aliyuncs.com:4000/19e4e541-3102-83e8-8000-095428dacd39";
  const conn = await mysql.createConnection(url);
  await conn.execute("SET FOREIGN_KEY_CHECKS = 0");

  const [rows] = await conn.execute("SHOW TABLES");
  const tables = (rows as any[]).map((r) => Object.values(r)[0] as string);

  for (const t of tables) {
    try {
      await conn.execute(`DROP TABLE IF EXISTS \`${t}\``);
      console.log(`Dropped ${t}`);
    } catch (e) {
      console.log(`Failed ${t}:`, (e as Error).message);
    }
  }

  await conn.execute("SET FOREIGN_KEY_CHECKS = 1");
  await conn.end();
  console.log("All tables dropped");
}

dropAll().catch(console.error);
