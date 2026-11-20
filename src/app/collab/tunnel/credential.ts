import type { DesktopCredentialRef } from '@/app/desktop/types'

/**
 * Credential that authenticates the ngrok share tunnel. Settings writes it
 * through the credential manager, and the desktop main process reads it from
 * its native store when the tunnel starts. Shared by both, so it imports no
 * app services.
 */
export const NGROK_AUTHTOKEN_CREDENTIAL: DesktopCredentialRef = {
  integrationId: 'ngrok',
  profileId: 'default',
  field: 'authtoken'
}

export const NGROK_AUTHTOKEN_URL = 'https://dashboard.ngrok.com/get-started/your-authtoken'
