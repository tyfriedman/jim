const path = require("path");

const dotenv = require(require.resolve("dotenv", { paths: [path.resolve(__dirname, "../server")] }));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: false });

const { withConnection } = require("../server/db/connection");

async function main() {
  const username = "ramzi";
  const coins = 100;

  const result = await withConnection(async (connection) => {
    const updateRes = await connection.execute(
      `UPDATE USERS
       SET coins = :coins
       WHERE LOWER(username) = LOWER(:username)`,
      { coins, username }
    );

    if (!updateRes.rowsAffected) {
      return { ok: false };
    }

    const readRes = await connection.execute(
      `SELECT user_id, username, coins
       FROM USERS
       WHERE LOWER(username) = LOWER(:username)`,
      { username },
      { outFormat: require("../server/db/connection").oracledb.OUT_FORMAT_OBJECT }
    );

    await connection.commit();
    const row = readRes.rows?.[0];
    return { ok: true, row };
  });

  if (!result.ok) {
    console.error("User 'ramzi' not found.");
    process.exitCode = 1;
    return;
  }

  console.log(`Updated ${result.row.USERNAME} (user_id=${result.row.USER_ID}) coins=${result.row.COINS}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

