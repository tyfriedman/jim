const oracledb = require("oracledb");

let pool;

function getConnectionString() {
  if (process.env.ORACLE_CONNECTION_STRING) {
    return process.env.ORACLE_CONNECTION_STRING;
  }

  const { ORACLE_USER, ORACLE_PASSWORD, ORACLE_HOST, ORACLE_PORT, ORACLE_SERVICE_NAME } = process.env;

  if (!ORACLE_USER || !ORACLE_PASSWORD || !ORACLE_HOST || !ORACLE_PORT || !ORACLE_SERVICE_NAME) {
    return null;
  }

  return `${ORACLE_USER}/${ORACLE_PASSWORD}@${ORACLE_HOST}:${ORACLE_PORT}/${ORACLE_SERVICE_NAME}`;
}

async function initPool() {
  if (pool) {
    return pool;
  }

  const connectString = getConnectionString();
  if (!connectString) {
    throw new Error("Missing Oracle connection configuration.");
  }

  pool = await oracledb.createPool({
    connectString,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1
  });

  return pool;
}

async function withConnection(work) {
  await initPool();
  const connection = await pool.getConnection();
  try {
    return await work(connection);
  } finally {
    await connection.close();
  }
}

async function query(sql, binds = {}, options = {}) {
  return withConnection(async (connection) => connection.execute(sql, binds, options));
}

async function closePool() {
  if (pool) {
    await pool.close(10);
    pool = null;
  }
}

module.exports = {
  initPool,
  withConnection,
  query,
  closePool,
  oracledb
};
