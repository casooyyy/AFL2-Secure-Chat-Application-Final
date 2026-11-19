
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

let username = "";
let targetUsername = "";

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
  const { username: newUsername, publicKey } = data;

  users.set(newUsername, publicKey);

  if (newUsername !== username) {
    console.log(`${newUsername} joined the chat`);
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

  // Start secret chat
  const match = message.match(/^!secret (\w+)$/);

  if (match) {
    targetUsername = match[1];

    if (!users.has(targetUsername)) {
      console.log(`User ${targetUsername} not found`);
      targetUsername = "";
    } else if (targetUsername === username) {
      console.log("You cannot send a secret message to yourself");
      targetUsername = "";
    } else {
      console.log(`Now secretly chatting with ${targetUsername}`);
    }
  }

  // Exit secret chat
  else if (message.trim() === "!exit") {
    console.log(`No more secretly chatting with ${targetUsername}`);
    targetUsername = "";
  }

  // Send normal or secret message
  else {
    const data = createSignedData(username, message);

    const signature = crypto.sign(
      "sha256",
      data,
      privateKey
    ).toString("hex");

    // Encrypt message for target user
    if (targetUsername) {
      try {
        const receiverPublicKey = users.get(targetUsername);

        const encryptedMessage = crypto.publicEncrypt(
          {
            key: receiverPublicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
          },
          Buffer.from(message, "utf8")
        ).toString("base64");

        socket.emit("message", {
          username,
          message: encryptedMessage,
          encrypted: true,
          targetUsername,
          signature,
        });

        console.log(`Secret message sent to ${targetUsername}`);
      } catch (error) {
        console.log("Encryption failed. Try a shorter message.");
      }
    }

    // Send normal message
    else {
      socket.emit("message", {
        username,
        message,
        signature,
        encrypted: false,
      });
    }
  }

  rl.prompt();
});

// Receive messages
socket.on("message", (data) => {
  const {
    username: senderUsername,
    message: senderMessage,
    signature,
    encrypted,
    targetUsername: receiver,
    senderId,
  } = data;

  // Ignore own messages
  if (senderId === socket.id) return;

  // Handle secret messages
  if (encrypted) {

    // Only the target user can decrypt
    if (receiver === username) {
      let decryptedMessage;

      try {
        decryptedMessage = crypto.privateDecrypt(
          {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
          },
          Buffer.from(senderMessage, "base64")
        ).toString("utf8");
      } catch (error) {
        console.log("Cannot decrypt this message");
        rl.prompt();
        return;
      }

      // Verify the sender's signature after successful decryption.
      const senderPublicKey = users.get(senderUsername);
      let isVerified = false;

      try {
        if (senderPublicKey && signature) {
          isVerified = crypto.verify(
            "sha256",
            createSignedData(senderUsername, decryptedMessage),
            senderPublicKey,
            Buffer.from(signature, "hex")
          );
        }
      } catch (error) {
        isVerified = false;
      }

      console.log(`${senderUsername} (secret): ${decryptedMessage}`);

      if (!isVerified) {
        console.log("WARNING: this user is fake");
      }

    } else {
      // Other users see ciphertext
      console.log(
        `${senderUsername} (encrypted): ${senderMessage}`
      );
    }

  } else {
    // Handle normal messages
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
