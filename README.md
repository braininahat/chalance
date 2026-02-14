# Chalance

decentralized moderation-free glass houses protocol for human connection

## Protocol

There is one rule: everything is public.

You enter a square. You talk. Everyone sees everything you say, everyone you talk to, and your entire history of how you've treated people. When you want to take it offline, you exchange phone numbers through an ephemeral channel that exists only in browser memory and is gone when you close the tab.

That's it.

There is no private messaging. There is no moderation team. There is no algorithm deciding who you see. There is no server that knows your precise location. There is no account, no email, no phone number required. Your identity is a cryptographic keypair on your device.

Moderation is mutually assured transparency. You behave because your words are permanent and public. There is no authority to appeal to and no one to ban you. There is only the permanent record of how you showed up.

## Architecture

- **Identity:** SEA keypair, generated and stored on device
- **Location:** GPS truncated to 5-character geohash (~5km) client-side before broadcast
- **Discovery:** Subscribe to your geohash cell + 8 neighbors. Chronological feed. No ranking.
- **Transport:** Gun.js for P2P data sync
- **Connect:** Ephemeral phone number exchange. Numbers encrypted to recipient's key, delivered via signaling channel. Never persisted. RAM only.

## Data Model

```
users/{pubkey}     -> { name, avatar, geohash, lastSeen }
squares/{geohash}  -> { postId -> { author, content, target, timestamp } }
connect/{pubkey}   -> { sigId -> { from, number (encrypted), timestamp } }
```

## Running

```bash
# any static file server
python3 -m http.server 8080
npx serve .
```

Open `http://localhost:8080`. For multi-user testing, use different browsers with the same manual geohash.

## What This Isn't

This is not a product. This is not a startup. This is a protocol spec and reference client.

Love should be free like water.

## License

AGPL-3.0
