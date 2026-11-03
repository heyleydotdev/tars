import { describe, expect, it } from 'vitest'

import * as schema from '@tars/db/schema'
import { getTableColumns, getTableName, is, SQLiteTable } from '@tars/db/sql'

import {
  pickSeedAccount,
  resolveSeedChoice,
  SEED_USER_SCOPE,
  seedSqlFor
} from '../scripts/seed-target'
import seedSql from '../scripts/seed.sql?raw'
import wipeSql from '../scripts/wipe.sql?raw'

// The scripts are SQL, so drizzle is the referee: every table and column in the
// files is checked against the schema that generates the migrations. A renamed
// column fails here instead of in a demo.
const tables = Object.values(schema).filter((value) => is(value, SQLiteTable))

type SchemaTable = (typeof tables)[number]

const byName = new Map<string, SchemaTable>(tables.map((table) => [getTableName(table), table]))

function columnsOf(table: SchemaTable): Set<string> {
  return new Set(Object.values(getTableColumns(table)).map((column) => column.name))
}

// Accounts and logins survive a wipe; everything else is demo data.
const KEPT_TABLES = new Set(['user', 'session', 'account'])

type Insert = { table: string; columns: Array<string> }

function seedInserts(): Array<Insert> {
  return [...seedSql.matchAll(/INSERT OR REPLACE INTO\s+(\w+)\s*\(([^)]*)\)/g)].map((match) => ({
    table: match[1] ?? '',
    columns: (match[2] ?? '')
      .split(',')
      .map((column) => column.trim())
      .filter(Boolean)
  }))
}

describe('seed.sql', () => {
  const inserts = seedInserts()

  it('only writes to real tables and columns', () => {
    expect(inserts.length).toBeGreaterThan(20)

    for (const { table, columns } of inserts) {
      const target = byName.get(table)

      expect(target, `unknown table ${table}`).toBeDefined()

      const known = columnsOf(target as SchemaTable)

      for (const column of columns) {
        expect(known.has(column), `${table}.${column}`).toBe(true)
      }
    }
  })

  it('fills the screens a judge opens first', () => {
    const seeded = new Set(inserts.map(({ table }) => table))

    for (const table of [
      'chat',
      'chat_message',
      'todo',
      'reminder',
      'expense',
      'journal_entry',
      'blueprint',
      'blueprint_requirement',
      'incident',
      'incident_analysis',
      'usage_event'
    ]) {
      expect(seeded.has(table), table).toBe(true)
    }
  })

  it('attaches every user-owned row to the chosen account', () => {
    const owned = inserts.filter(({ table }) => {
      const target = byName.get(table)

      return target ? columnsOf(target).has('user_id') : false
    })
    const scoped = seedSql.split(SEED_USER_SCOPE).length - 1

    expect(owned.length).toBeGreaterThan(0)
    expect(scoped).toBe(owned.length)
  })
})

describe('seed account targeting', () => {
  const ada = { id: 'u1', email: 'ada@tars.dev' }
  const me = { id: 'u2', email: 'me@example.com' }

  it('takes a listed number, id, or email as the answer', () => {
    expect(resolveSeedChoice('2', [ada, me])).toEqual(me)
    expect(resolveSeedChoice('u1', [ada, me])).toEqual(ada)
    expect(resolveSeedChoice(' Me@Example.com ', [ada, me])).toEqual(me)
  })

  it('rejects a number that is not listed', () => {
    expect(resolveSeedChoice('3', [ada, me])).toBeNull()
    expect(resolveSeedChoice('', [ada, me])).toBeNull()
    expect(resolveSeedChoice('nobody@example.com', [ada, me])).toBeNull()
  })

  it('matches the account passed to the task', () => {
    expect(pickSeedAccount([ada, me], ' Me@Example.com ')).toEqual(me)
  })

  it('lists the known accounts when the address is wrong', () => {
    expect(() => pickSeedAccount([ada, me], 'nobody@example.com')).toThrow(/ada@tars.dev/)
  })

  it('points every user-owned row at the chosen account', () => {
    const sql = seedSqlFor(
      `INSERT INTO chat VALUES (${SEED_USER_SCOPE}), (${SEED_USER_SCOPE})`,
      "o'brien"
    )

    expect(sql).not.toContain(SEED_USER_SCOPE)
    expect(sql.match(/o''brien/g)).toHaveLength(2)
  })

  it('cannot run without the chosen account', () => {
    expect(seedSql).toContain(SEED_USER_SCOPE)
    expect(seedSql).not.toMatch(/SELECT id FROM user/)
  })

  it('fails loudly when seed.sql loses its user scope', () => {
    expect(() => seedSqlFor('INSERT INTO chat VALUES (1)', 'u1')).toThrow(/seed.sql/)
  })
})

describe('wipe.sql', () => {
  const deleted = new Set(
    [...wipeSql.matchAll(/DELETE FROM\s+(\w+)/g)].map((match) => match[1] ?? '')
  )

  it('deletes every table that is not an account', () => {
    for (const table of byName.keys()) {
      if (KEPT_TABLES.has(table)) continue

      expect(deleted.has(table), `wipe misses ${table}`).toBe(true)
    }
  })

  it('keeps accounts and logins', () => {
    for (const table of KEPT_TABLES) {
      expect(deleted.has(table), `wipe must not touch ${table}`).toBe(false)
    }
  })
})
