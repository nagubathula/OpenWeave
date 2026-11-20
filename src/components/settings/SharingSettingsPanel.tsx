import { useEffect, useState } from 'react'

import { useI18n } from '@openweave/react'

import { ngrokAuthtokenStatus, setNgrokAuthtoken } from '@/app/collab/tunnel/authtoken'
import { NGROK_AUTHTOKEN_URL } from '@/app/collab/tunnel/credential'
import type { CredentialStatus } from '@/app/settings/credentials/types'
import { CredentialKeyField } from '@/components/settings/CredentialKeyField'

/** Desktop-only: the authtoken for the built-in ngrok share tunnel. */
export default function SharingSettingsPanel() {
  const { dialogs } = useI18n()
  const [status, setStatus] = useState<CredentialStatus>('missing')

  useEffect(() => {
    let active = true
    void ngrokAuthtokenStatus().then((next) => {
      if (active) setStatus(next)
    })
    return () => {
      active = false
    }
  }, [])

  const update = async (value: string) => {
    await setNgrokAuthtoken(value)
    setStatus(await ngrokAuthtokenStatus())
  }

  return (
    <div className="flex flex-col gap-3" data-test-id="settings-sharing-panel">
      <div>
        <h3 className="text-xs font-semibold text-surface">{dialogs.sharingTunnel}</h3>
        <p className="mt-0.5 text-[10px] text-muted">{dialogs.sharingTunnelDescription}</p>
      </div>

      <CredentialKeyField
        labels={{
          label: dialogs.sharingAuthtoken,
          saved: dialogs.sharingSavedAuthtoken,
          placeholder: dialogs.sharingAuthtokenPlaceholder,
          savedPlaceholder: dialogs.sharingSavedAuthtokenPlaceholder,
          save: dialogs.sharingSaveAuthtoken,
          clear: dialogs.sharingClearAuthtoken,
          getKey: dialogs.sharingGetAuthtoken
        }}
        status={status}
        keyURL={NGROK_AUTHTOKEN_URL}
        data-test-id="settings-ngrok-authtoken"
        onSave={update}
        onClear={() => update('')}
      />

      {status !== 'configured' && (
        <p className="text-[10px] text-muted">{dialogs.sharingAuthtokenFallback}</p>
      )}
    </div>
  )
}
