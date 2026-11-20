---
title: Collaboration
description: Real-time collaborative editing hosted from the OpenWeave desktop app and shared over one ngrok link. No account, no cloud service.
---

# Collaboration

Edit designs together in real time. The OpenWeave desktop app hosts the session itself, so you don't need an account or a cloud service.

## Sharing a Room

1. Click the share button in the top-right corner of the desktop app
2. Choose **Share via ngrok tunnel** to open the room and start an ngrok tunnel in one step
3. Send the copied `https://<your-tunnel>/share?room=<room-id>` link to your collaborators

Invitees open the link in any modern browser and don't need to install anything. They can also paste the link into the join field of their own OpenWeave desktop app. If you set a room password, invitees must enter it before they can join.

ngrok is built into the desktop app, so there's nothing else to install. It needs an ngrok account (the free plan works):

1. Copy your authtoken from the [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)
2. Open **Settings › Sharing** in the desktop app and paste it. It's kept in your system credential store (Keychain, Windows Credential Manager, or libsecret)

If you already use ngrok, you can skip this: without a saved authtoken, the app uses `NGROK_AUTHTOKEN` or the authtoken in your ngrok agent config (from `ngrok config add-authtoken`).

Before the editor loads, invitees see ngrok's one-time "You are about to visit" page. The free plan allows one ngrok session at a time, so stop other ngrok agents on the same account before sharing.

## Sharing Several Files

Each open tab is shared on its own. Switch to another tab and share it to get a separate link with its own password and guest list; the share panel always shows the active tab's room, and shared tabs show a people icon. All links run through the same ngrok tunnel (and the same local-network address), so sharing more files doesn't start more tunnels.

Opening a share link, or pasting one into the join field, opens that file in a new tab, so a collaborator can be in several of your files at once. Closing a tab leaves its room. The tunnel stops when the last shared tab leaves its room.

## Sharing on Your Local Network

To collaborate with people on the same Wi-Fi or office network, choose **Share locally only**. The copied link points at your computer's network address (for example `http://192.168.1.20:52341/share?room=<room-id>`) and works without internet access or ngrok. The share panel labels it **Local network**.

The first time you share locally on Windows, the firewall asks whether OpenWeave may accept connections. Allow it on private networks, or collaborators can't connect. If your computer isn't on a network, the link is labelled **This computer only** and opens only on your own machine.

## What Syncs

- **Document changes:** every edit (shapes, text, properties, layout) syncs instantly
- **Cursors:** see where each collaborator is pointing, with their name and color
- **Selections:** each collaborator's selection is visible to everyone

## Follow Mode

Click a collaborator's avatar in the top bar to follow their viewport. Your canvas pans and zooms to match their view. Click again to stop following.

## How It Works

The desktop app runs a small local server that does two jobs: it serves the editor to invitees, and it relays collaboration messages between everyone in the room. ngrok exposes that one server, so the share link carries both the app and the live session.

- **No other services.** No signaling brokers, STUN or TURN servers, or peer-to-peer NAT traversal. Sharing works on any network ngrok can reach, including corporate networks and mobile hotspots.
- **Offline editing.** The editor itself never needs the internet. Only the share link does.
- **Host-only rooms.** Only the host's own window can open a room. Invitees can join a room only while it is open, and only with its id and password. The password is hashed before it is sent.
- **Conflict-free merging.** The document state is a CRDT (conflict-free replicated data type), so concurrent edits merge automatically.

The room persists locally. If you refresh the page, you rejoin with the same state, and dropped connections reconnect automatically.

When the web app runs from a static host instead of the desktop app, collaboration falls back to WebRTC peer-to-peer connections. That mode relies on public signaling and STUN servers.

## Tips

- Room IDs are cryptographically random, so only people with the link can join
- Rooms close when every participant has left
- Stale cursors are cleaned up automatically when someone disconnects
