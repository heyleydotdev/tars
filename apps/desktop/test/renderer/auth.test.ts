import { beforeEach, describe, expect, it, vi } from 'vitest'

import { changePassword } from '../../src/renderer/src/lib/auth'

const changePasswordBridge = vi.fn()

beforeEach(() => {
  vi.stubGlobal('window', { changePassword: changePasswordBridge })
  changePasswordBridge.mockReset()
})

describe('changePassword', () => {
  it('passes the passwords to the Electron bridge', async () => {
    changePasswordBridge.mockResolvedValue({ error: null })

    await changePassword('old-password', 'new-password')

    expect(changePasswordBridge).toHaveBeenCalledWith({
      currentPassword: 'old-password',
      newPassword: 'new-password'
    })
  })

  it('throws the bridge error', async () => {
    changePasswordBridge.mockResolvedValue({ error: 'Wrong password' })

    await expect(changePassword('wrong', 'new-password')).rejects.toThrow('Wrong password')
  })
})
