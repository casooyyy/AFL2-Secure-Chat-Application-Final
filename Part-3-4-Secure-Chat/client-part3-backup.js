
const io = require("socket.io-client");
const readline = require("readline");
const crypto = require("crypto");

const socket = io("http://localhost:3000");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

// Generate RSA keys
const { publicKey, privateKey } =
  crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

let registeredUsername = "";
let username = "";

const users = new Map();

// Create signed message
function createSignedData(username, message) {
  return Buffer.from(
    JSON.stringify({ username, message }),
    "utf8"
  );
}

// Connect to server
socket.on("connect", () => {
  console.log("Connected to the server");

  rl.question("Enter your username: ", (input) => {
    username = input.trim();
    registeredUsername = username;

    console.log(`Welcome, ${username} to the chat`);

    users.set(username, publicKey);

    socket.emit("registerPublicKey", {
      username,
      publicKey,
    });

    rl.prompt();
  });
});

// Receive existing users
socket.on("init", (keys) => {
  keys.forEach(([user, key]) => {
    users.set(user, key);
  });

  console.log(`There are currently ${users.size} users in the chat`);
  rl.prompt();
});

// New user notification
socket.on("newUser", (data) => {
  const { username, publicKey } = data;

  users.set(username, publicKey);

  if (username !== registeredUsername) {
    console.log(`${username} joined the chat`);
  }

  rl.prompt();
});

// Remove users who disconnect so their public keys are not kept as stale entries.
socket.on("userLeft", (data) => {
  const leftUsername = data?.username;
  if (typeof leftUsername === "string") {
    users.delete(leftUsername);

    if (typeof targetUsername !== "undefined" && targetUsername === leftUsername) {
      targetUsername = "";
      console.log(`${leftUsername} left the chat. Secret chat ended.`);
    } else {
      console.log(`${leftUsername} left the chat`);
    }
  }

  rl.prompt();
});

// Stop if the username could not be registered.
socket.on("registrationError", (data) => {
  console.log(data?.message || "Could not register this username.");
  socket.disconnect();
  rl.close();
});

// Send messages
rl.on("line", (message) => {
  if (!message.trim()) {
    rl.prompt();
    return;
  }

  const match = message.match(/^!impersonate (\w+)$/);

  if (match) {
    username = match[1];
    console.log(`Now impersonating as ${username}`);
  } else if (message.trim() === "!exit") {
    username = registeredUsername;
    console.log(`Now you are ${username}`);
  } else {
    const data = createSignedData(username, message);

    const signature = crypto.sign(
      "sha256",
      data,
      privateKey
    ).toString("hex");

    socket.emit("message", {
      username,
      message,
      signature,
    });
  }

  rl.prompt();
});

// Receive and verify messages
socket.on("message", (data) => {
  const {
    username: senderUsername,
    message: senderMessage,
    signature,
    senderId,
  } = data;

  if (senderId === socket.id) return;

  console.log(`${senderUsername}: ${senderMessage}`);

  const senderPublicKey = users.get(senderUsername);

  let isVerified = false;

  try {
    if (senderPublicKey && signature) {
      isVerified = crypto.verify(
        "sha256",
        createSignedData(senderUsername, senderMessage),
        senderPublicKey,
        Buffer.from(signature, "hex")
      );
    }
  } catch (error) {
    isVerified = false;
  }

  if (!isVerified) {
    console.log("WARNING: this user is fake");
  }

  rl.prompt();
});

// Disconnect
socket.on("disconnect", () => {
  console.log("Server disconnected, Exiting...");
  rl.close();
  process.exit(0);
});

rl.on("SIGINT", () => {
  console.log("\nExiting...");
  socket.disconnect();
  rl.close();
  process.exit(0);
});
