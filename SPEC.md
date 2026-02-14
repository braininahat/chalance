# Chalance

## The Problem

Every platform that connects people extracts from the connection. The algorithm decides who you see. The company decides how you behave. Your data funds their growth. Your loneliness is their revenue model.

Dating apps are the worst version of this. They are designed to keep you swiping, not to help you find someone. A successful match is a lost customer. The entire business model is adversarial to its stated purpose.

Moderation systems that claim to protect you also control you. Shadowbans, invisible ranking, behavioral scores you can't see or contest. You are performing for a system that won't tell you its rules.

This has been solvable for a long time. The reason it hasn't been solved is that the solution isn't profitable.

## The Protocol

Chalance is a glass houses protocol for human connection. The entire design follows from one principle: **everything is public**.

You enter a square. You talk. Everyone can see what you say, who you say it to, and your entire history of how you've shown up. When two people want to take it offline, they exchange phone numbers through an ephemeral channel that exists only in memory and disappears when the tab closes.

There is no private messaging. There is no algorithm. There is no moderation team. There is no server that knows your precise location. There is no account.

### Identity

Your identity is a cryptographic keypair generated on your device. No email. No phone number. No OAuth. No server stores your credentials because there are no credentials. You are your key.

Your name and avatar are self-declared. There is no verification because there is nothing to verify. Your public history is your identity. What you've said and how you've treated people is the only credential that matters.

### Location

GPS coordinates are truncated to a 5-character geohash on your device before anything is broadcast. This gives approximately 5km precision. The network never receives, transmits, or stores precise coordinates.

You subscribe to your geohash cell and its 8 neighbors, giving you a view of roughly 15km in any direction. This is your square.

You can also enter a geohash manually. If someone in another city wants to hang out in your square, that's their business.

### Discovery

There is no matching algorithm. There is no ranking system. There is no engagement optimization.

The feed is chronological. Everyone in your cells, in order. You scroll, you read, you see how people talk. Someone catches your eye by what they say, not what they look like. You post on their wall or post to the square.

This is how it works at a bar, a park, a party. You don't need a recommendation engine to notice someone interesting across the room.

### The Public Record

Every post is permanent and public. Your wall is your history. There is no delete.

This is the moderation mechanism. There is no moderation team because there doesn't need to be. Harassment is self-punishing because it's permanently visible. Creepy behavior is legible to everyone in the square. You don't need to report someone to a faceless system. Everyone can already see what they did.

The incentive structure: you behave because your words are permanent and attributed. Not because an authority will punish you, but because everyone can see you. This is how human communities have worked for most of history. The anonymity of scale is what broke it. The public square restores it.

### Ephemeral Connect

When two people want to move to a phone call, text, or meeting, either party can initiate a connect. This prompts them to enter their phone number. The number is encrypted to the other party's public key and delivered through a signaling channel. It is rendered in the recipient's browser memory and never written to any persistent store.

When either party closes the tab, navigates away, or the browser reclaims memory, the number is gone. The public record shows only that a connection occurred, with a timestamp. The number itself existed on two screens and nowhere else.

This makes the phone exchange what it actually is: a moment of trust between two people, not a data point in a system.

## Architecture

### Transport

Gun.js for peer-to-peer data synchronization. Posts propagate through a gossip network. No central server is required, though relay peers improve availability.

### Data Model

```
users/{pubkey}
  name:       string
  avatar:     json (hue, eyes, mouth)
  geohash:    string (5 chars)
  lastSeen:   timestamp

squares/{geohash}/{postId}
  author:       pubkey
  authorName:   string
  authorAvatar: json
  content:      string (max 500 chars)
  target:       pubkey | "" (directed post or broadcast)
  geohash:      string
  timestamp:    timestamp

connect/{pubkey}/{signalId}
  from:       pubkey
  fromName:   string
  number:     encrypted string (recipient's key)
  timestamp:  timestamp
```

### Geohash

Standard geohash encoding. 5-character precision yields cells of approximately 4.9km x 4.9km at the equator, narrowing at higher latitudes. Each cell has 8 neighbors. A client subscribes to its own cell plus all neighbors for a total of 9 cells.

Client-side only. The encoding happens on the device. Raw GPS coordinates are never transmitted.

### Encryption

SEA (Security, Encryption, Authorization) via Gun.js for keypair generation and management. Connect signals are encrypted using the recipient's public key. All other data is plaintext by design, because everything is public by design.

## What This Is Not

This is not a product. There is no company behind it. There is no business model. There is no growth strategy. There is no roadmap driven by investor expectations.

This is a protocol specification and a reference client. Anyone can build a client that speaks this protocol. Anyone can run a relay. Anyone can fork it. The AGPL license ensures that anyone who runs a modified version as a network service must publish their source.

No one owns the square.

## What Remains Open

**Sybil resistance.** Nothing stops someone from generating multiple keypairs. The public history provides natural resistance (empty history is a signal) but a determined attacker can create fake histories. Possible future approaches: social vouching, proof-of-phone (without storing the number), or web of trust. Or just accepting that the public record is sufficient.

**Persistence and availability.** Gun.js provides eventual consistency but relies on peer availability. A mature deployment would benefit from dedicated relay infrastructure. The protocol itself is transport-agnostic.

**Scalability of the feed.** A busy geohash cell could generate thousands of posts per day. The reference client shows the most recent 200. Filtering, search, and pagination are client-side concerns, not protocol concerns.

**Avatar extensibility.** The reference client uses simple procedural faces. The protocol stores avatar data as JSON. A different client could implement full character creators, pixel art, 3D models, or anything else. The protocol doesn't care.

**Applications beyond dating.** The protocol is relationship-agnostic. Public trust building followed by private offramp applies to mentorship, freelancing, roommate matching, community formation, and anything else where trust matters and current systems are opaque. Different clients can serve different use cases on the same protocol.

## Principles

1. Everything is public unless two people mutually choose to leave.
2. No one decides who you see except you.
3. No one owns your identity except you.
4. No one profits from your loneliness.
5. The only reputation system is your own words.
6. The protocol is the product. Clients are implementations.
7. If it can't run without a company, it's not decentralized.
