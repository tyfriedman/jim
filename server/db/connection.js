const oracledb = require("oracledb");

let pool;

function getPoolConfigFromEnv() {
  const {
    ORACLE_CONNECTION_STRING,
    ORACLE_USER,
    ORACLE_PASSWORD,
    ORACLE_HOST,
    ORACLE_PORT,
    ORACLE_SERVICE_NAME
  } = process.env;

  if (ORACLE_CONNECTION_STRING) {
    // Accept either:
    // 1) host:port/service (preferred)
    // 2) user/password@host:port/service (legacy convenience)
    const parsed = ORACLE_CONNECTION_STRING.match(/^([^/]+)\/([^@]+)@(.+)$/);
    if (parsed) {
      return {
        user: parsed[1],
        password: parsed[2],
        connectString: parsed[3]
      };
    }

    if (!ORACLE_USER || !ORACLE_PASSWORD) {
      return null;
    }

    return {
      user: ORACLE_USER,
      password: ORACLE_PASSWORD,
      connectString: ORACLE_CONNECTION_STRING
    };
  }

  if (!ORACLE_USER || !ORACLE_PASSWORD || !ORACLE_HOST || !ORACLE_PORT || !ORACLE_SERVICE_NAME) {
    return null;
  }

  return {
    user: ORACLE_USER,
    password: ORACLE_PASSWORD,
    connectString: `${ORACLE_HOST}:${ORACLE_PORT}/${ORACLE_SERVICE_NAME}`
  };
}

async function initPool() {
  if (pool) {
    return pool;
  }

  const poolConfig = getPoolConfigFromEnv();
  if (!poolConfig) {
    throw new Error("Missing Oracle connection configuration.");
  }

  pool = await oracledb.createPool({
    ...poolConfig,
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
