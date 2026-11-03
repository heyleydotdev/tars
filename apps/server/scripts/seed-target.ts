// Pure half of the seed CLI: turn what the user typed into an account, and
// point the seed SQL at it. Split out so it can be tested without wrangler.

export const SEED_USER_SCOPE = '(SELECT id FROM seed_target)'

export type SeedAccount = { id: string; email: string }

export function resolveSeedChoice(
  choice: string,
  accounts: Array<SeedAccount>
): SeedAccount | null {
  const value = choice.trim()

  if (!value) return null

  const index = Number(value)

  if (Number.isInteger(index) && index >= 1 && index <= accounts.length) {
    return accounts[index - 1] ?? null
  }

  return (
    accounts.find((account) => account.id === value) ??
    accounts.find((account) => account.email.toLowerCase() === value.toLowerCase()) ??
    null
  )
}

export function pickSeedAccount(accounts: Array<SeedAccount>, email: string): SeedAccount {
  const wanted = email.trim().toLowerCase()
  const match = accounts.find((account) => account.email.toLowerCase() === wanted)

  if (!match) {
    throw new Error(
      `No account uses ${email}. Accounts: ${accounts.map((a) => a.email).join(', ')}.`
    )
  }

  return match
}

export function seedSqlFor(sql: string, accountId: string): string {
  if (!sql.includes(SEED_USER_SCOPE)) {
    throw new Error(`seed.sql lost "${SEED_USER_SCOPE}", so the seed would reach no account.`)
  }

  return sql.replaceAll(SEED_USER_SCOPE, `'${accountId.replaceAll("'", "''")}'`)
}
