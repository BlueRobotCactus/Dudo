import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!pool) {
    if (process.env.INSTANCE_UNIX_SOCKET) {
      pool = mysql.createPool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        socketPath: process.env.INSTANCE_UNIX_SOCKET,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
      });
    } else {
      pool = mysql.createPool({
        host: 'host.docker.internal',
        port: 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
      });
    }
  }
  return pool;
}