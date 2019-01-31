import knex from 'knex'

const queries: any = {
  mssql: (knex: knex, schemaName: string) => ({
    sql: `select table_name from information_schema.tables
    where table_type = 'BASE TABLE' and table_schema = ? and table_catalog = ?`,
    bindings: [schemaName, knex.client.database()],
    output: (resp: any) => resp.rows.map((table: any) => ({ name: table.table_name })),
  }),

  mysql: (knex: knex, schemaName: string) => ({
    sql: `select table_name, table_comment from information_schema.tables where table_schema = ?`,
    bindings: [knex.client.database()],
    output: (resp: any) => resp.map((table: any) => ({ name: table.table_name, comment: table.table_comment })),
  }),

  oracle: (knex: knex, schemaName: string) => ({
    sql: `select table_name from user_tables`,
    output: (resp: any) => resp.map((table: any) => ({ name: table.TABLE_NAME })),
  }),

  postgres: (knex: knex, schemaName: string) => ({
    sql: `select t.table_name, d.description from information_schema.tables t
    inner join pg_class c on c.relkind = 'r' and c.relname = t.table_name
    left join pg_description d on d.objoid = c.oid
    where t.table_schema = ? and t.table_catalog = ?`,
    bindings: [schemaName, knex.client.database()],
    output: (resp: any) => resp.rows.map((table: any) => ({ name: table.table_name, comment: table.description })),
  }),

  sqlite3: (knex: knex, schemaName: string) => ({
    sql: `SELECT name FROM sqlite_master WHERE type='table';`,
    output: (resp: any) => resp.map((table: any) => ({ name: table.name })),
  }),
}

export default async function(knex: knex, schemaName: string) {
  const query = queries[knex.client.config.client]
  if (!query) {
    console.error(`Client ${knex.client.config.client} not supported`)
  }
  const { sql, bindings, output } = query(knex, schemaName)
  const resp = await knex.raw(sql, bindings)
  return output(resp)
}
