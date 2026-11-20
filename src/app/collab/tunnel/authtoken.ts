import { NGROK_AUTHTOKEN_CREDENTIAL } from '@/app/collab/tunnel/credential'
import { appCredentialServices } from '@/app/settings/credentials/app'
import type { CredentialStatus } from '@/app/settings/credentials/types'

export function ngrokAuthtokenStatus(): Promise<CredentialStatus> {
  return appCredentialServices.manager.status(NGROK_AUTHTOKEN_CREDENTIAL)
}

/** Saves the authtoken the desktop share tunnel uses; an empty value clears it. */
export async function setNgrokAuthtoken(value: string): Promise<void> {
  const authtoken = value.trim()
  if (authtoken) await appCredentialServices.manager.set(NGROK_AUTHTOKEN_CREDENTIAL, authtoken)
  else await appCredentialServices.manager.clear(NGROK_AUTHTOKEN_CREDENTIAL)
}
