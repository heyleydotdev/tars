import type { Database } from '@tars/db/client'

import { createAuth } from './src/server'

export const auth = createAuth({
  db: {} as Database,
  BETTER_AUTH_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: '2f647b5b616c1bb5ad1d9056492f819db4949ed2841dddea5860286aeddba797' // placeholder
})
