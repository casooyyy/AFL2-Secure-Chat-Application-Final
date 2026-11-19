# AFL 2 - Secure Chat Application

## Project Parts

### Part 1 - Basic Chat Application
A simple chat application using Node.js and Socket.IO. Users can connect to the server, choose a username, and send messages to other users.

### Part 2 - Message Integrity
Uses SHA-256 to check whether messages have been modified during transmission. A malicious server is also included to simulate message modification.

### Part 3 - User Impersonation
Uses RSA digital signatures to verify the sender's identity and detect impersonation attempts.

### Part 4 - Secret Messaging
Uses RSA encryption to send private messages. Only the selected recipient can decrypt and read the original message.

## Project Structure

- `Part-1-2-Basic-Chat-and-Hash/` - Basic chat and SHA-256 message integrity.
- `Part-3-4-Secure-Chat/` - RSA digital signature and secret messaging.

## Requirements

- Node.js
- npm

## How to Run

Install dependencies inside the folder of the part you want to run:

```bash
npm install
```

### Part 1
Run the normal server:

```bash
node server.js
```

Open another terminal:

```bash
node client.js
```

### Part 2
Run the malicious server instead:

```bash
node malicious-server.js
```

Then run the client in another terminal.

### Part 3
Run `server.js`, then start the clients using:

```bash
node client-part3-backup.js
```

Use `!impersonate username` to test impersonation and `!exit` to return to your original username.

### Part 4
Run `server.js`, then start the clients using:

```bash
node client.js
```

Use `!secret username` to select a recipient and `!exit` to return to normal chat.

## Technologies

- Node.js
- Socket.IO
- SHA-256
- RSA Digital Signature
- RSA-OAEP Encryption
