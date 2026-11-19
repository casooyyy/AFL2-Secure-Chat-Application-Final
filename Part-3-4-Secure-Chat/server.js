const http = require("http");
const socketIo = require("socket.io");

const server = http.createServer();
const io = socketIo(server);

// Store each connected user's public key and the socket that owns the username.
const users = new Map();
const userOwners = new Map();

io.on("connection", (socket) => {
  console.log(`Client ${socket.id} connected`);

  // Send existing users to the new client.
  socket.emit("init", Array.from(users.entries()));

  let registeredUsername = "";

  socket.on("registerPublicKey", (data = {}) => {
    const username = typeof data.username === "string" ? data.username.trim() : "";
    const publicKey = data.publicKey;

    if (!username || typeof publicKey !== "string" || !publicKey.includes("BEGIN PUBLIC KEY")) {
      socket.emit("registrationError", {
        message: "A valid username and public key are required.",
      });
      return;
    }

    const currentOwner = userOwners.get(username);
    if (currentOwner && currentOwner !== socket.id) {
      socket.emit("registrationError", {
        message: `The username ${username} is already in use. Please choose another username.`,
      });
      return;
    }

    registeredUsername = username;
    users.set(username, publicKey);
    userOwners.set(username, socket.id);

    console.log(`${username} registered with public key.`);
    io.emit("newUser", { username, publicKey });
  });

  // Broadcast messages. The signature is verified by receiving clients.
  socket.on("message", (data) => {
    if (!data || typeof data !== "object") return;

    io.emit("message", {
      ...data,
      senderId: socket.id,
    });
  });

  socket.on("disconnect", () => {
    if (registeredUsername && userOwners.get(registeredUsername) === socket.id) {
      users.delete(registeredUsername);
      userOwners.delete(registeredUsername);
      io.emit("userLeft", { username: registeredUsername });
    }

    console.log(`Client ${socket.id} disconnected`);
  });
});

const port = 3000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
