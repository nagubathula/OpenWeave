import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os'

/**
 * Picks the IPv4 address other devices on the local network can reach this
 * computer at, for "Share locally" links. Virtual adapters (WSL, Hyper-V,
 * Docker, VPNs, VM host-only networks) also have private addresses, but
 * collaborators can't reach them, so they rank last.
 */

const VIRTUAL_ADAPTER =
  /vethernet|virtualbox|vmware|vmnet|vbox|docker|wsl|hyper-v|loopback|br-|veth|utun|tun|tap|vpn|nordlynx|wireguard|wg\d|wintun|tailscale|zerotier|mullvad|proton/i

function privateRangeRank(address: string): number {
  if (address.startsWith('192.168.')) return 0
  if (address.startsWith('10.')) return 1
  const [first, second] = address.split('.').map(Number)
  if (first === 172 && second >= 16 && second <= 31) return 2
  return 3
}

export function pickLanAddress(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces()
): string | null {
  const candidates: Array<{ address: string; rank: number }> = []
  for (const [name, infos] of Object.entries(interfaces)) {
    for (const info of infos ?? []) {
      if (info.family !== 'IPv4' || info.internal) continue
      // 169.254.x.x is self-assigned: the adapter has no working network.
      if (info.address.startsWith('169.254.')) continue
      const virtual = VIRTUAL_ADAPTER.test(name) ? 10 : 0
      candidates.push({ address: info.address, rank: virtual + privateRangeRank(info.address) })
    }
  }
  candidates.sort((a, b) => a.rank - b.rank)
  return candidates[0]?.address ?? null
}
