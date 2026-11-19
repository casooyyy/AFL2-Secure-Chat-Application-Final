# AFL 2 — Secure Chat Application

This repository contains the four tutorial parts for the AFL 2 Secure Chat Application assignment.

## Project structure

```text
AFL2-Secure-Chat-Application-Final/
├── node-chat-app-backup-tutorial-2/   # Part 1 and Part 2
│   ├── client.js
│   ├── server.js
│   ├── malicious-server.js
│   ├── package.json
│   └── package-lock.json
└── node-chat-app/                     # Part 3 and Part 4
    ├── client.js
    ├── client-part3-backup.js
    ├── server.js
    ├── package.json
    └── package-lock.json
```

## Requirements

- Node.js and npm
- Three or more terminal sessions for multi-user demonstrations
- Only one server should run at a time because all parts use port `3000`

Install dependencies inside the folder for the part you want to run:

```bash
npm ci
```

## Part 1 — Basic Chat and SHA-256

Use the `node-chat-app-backup-tutorial-2` folder.

1. Terminal 1: `npm start`
2. Terminal 2: `npm run client` and enter a username, for example `Casey`.
3. Terminal 3: `npm run client` and enter a different username, for example `Jane`.
4. Send messages in both directions. The sender's original hash and the receiver's message hash should match when the normal server does not modify the message.

## Part 2 — Malicious Chat Server

Use the same `node-chat-app-backup-tutorial-2` folder.

1. Stop the normal server and clients with `Ctrl+C`.
2. Terminal 1: `npm run start:malicious`
3. Start two clients in separate terminals with `npm run client`.
4. Send a message. The malicious server appends `(sus?)` to the message. The receiving client should show a SHA-256 mismatch warning.

## Part 3 — Digital Signature and Impersonation

Use the `node-chat-app` folder.

1. Terminal 1: `npm start`
2. Terminal 2: `npm run client:impersonation` and enter a username, for example `Casey`.
3. Terminal 3: `npm run client:impersonation` and enter a different username, for example `Jane`.
4. In one client, enter `!impersonate Casey` (replace `Casey` with the other user's username), then send a message.
5. The receiving client should display `WARNING: this user is fake` because the signature does not match the claimed username.
6. Enter `!exit` to return to the registered username and send a normal message.

## Part 4 — RSA Secret Messaging

Use the same `node-chat-app` folder and the normal server (`npm start`).

1. Start three clients in separate terminals with `npm run client`. Use unique usernames, for example `Casey`, `Jessie`, and `Chloe`.
2. In the sender's terminal, enter `!secret Jessie` (replace `Jessie` with the exact recipient username).
3. Send a short secret message.
4. The intended recipient should see the decrypted plaintext. The other client should see encrypted ciphertext rather than the original message.
5. Enter `!exit` to leave secret mode and return to normal chat.

**Message-size note:** RSA-OAEP with a 2048-bit key and SHA-256 can encrypt at most 190 bytes per message. Keep the secret demonstration message short.

## Code checks

Run this inside either project folder:

```bash
npm test
```

This runs `node --check` on the JavaScript files. It checks syntax; the multi-client steps above are the functional tests.

## Manual test results

The four parts were run on macOS with live Socket.IO clients:

- **Part 1:** Two clients exchanged messages in both directions; original and received SHA-256 hashes matched on the normal server.
- **Part 2:** The malicious server modified messages in both directions; the receiving clients displayed a hash-mismatch warning.
- **Part 3:** An impersonation attempt triggered `WARNING: this user is fake`; `!exit` restored the registered username and a normal message was accepted.
- **Part 4:** The intended recipient decrypted a secret message, the third client saw ciphertext, and `!exit` restored normal group messaging.

## Educational-use note

This is a classroom demonstration, not a production-ready secure chat application. It uses local HTTP/Socket.IO without TLS, and its public-key registration is not backed by an external identity authority.
