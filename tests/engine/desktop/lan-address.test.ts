import { describe, expect, test } from 'bun:test'
import type { NetworkInterfaceInfo } from 'node:os'

import { pickLanAddress } from '#desktop/lan-address'

function ipv4(address: string, internal = false): NetworkInterfaceInfo {
  return {
    address,
    netmask: '255.255.255.0',
    family: 'IPv4',
    mac: '00:00:00:00:00:00',
    internal,
    cidr: `${address}/24`
  }
}

describe('pickLanAddress', () => {
  test('prefers a home or office network over virtual adapters', () => {
    expect(
      pickLanAddress({
        'vEthernet (WSL)': [ipv4('172.20.144.1')],
        'Wi-Fi': [ipv4('192.168.1.20')],
        'Loopback Pseudo-Interface 1': [ipv4('127.0.0.1', true)]
      })
    ).toBe('192.168.1.20')
  })

  test('ranks VPN adapters below the physical network', () => {
    expect(
      pickLanAddress({
        NordLynx: [ipv4('10.5.0.2')],
        'OpenVPN Data Channel Offload for NordVPN': [ipv4('10.8.0.3')],
        Ethernet: [ipv4('10.255.1.211')]
      })
    ).toBe('10.255.1.211')
  })

  test('skips internal, self-assigned and IPv6 addresses', () => {
    expect(
      pickLanAddress({
        lo: [ipv4('127.0.0.1', true)],
        Ethernet: [
          ipv4('169.254.10.2'),
          { ...ipv4('fe80::1'), family: 'IPv6', cidr: 'fe80::1/64', scopeid: 1 }
        ],
        eth0: [ipv4('10.0.0.7')]
      })
    ).toBe('10.0.0.7')
  })

  test('falls back to a virtual adapter, and returns null with no network', () => {
    expect(pickLanAddress({ 'vEthernet (Default Switch)': [ipv4('172.17.0.1')] })).toBe(
      '172.17.0.1'
    )
    expect(pickLanAddress({ lo: [ipv4('127.0.0.1', true)] })).toBeNull()
  })
})
