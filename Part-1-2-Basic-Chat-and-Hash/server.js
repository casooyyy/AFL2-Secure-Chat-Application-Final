
const http = require("http");
const socketIo = require("socket.io");

const server = http.createServer();
const io = socketIo(server);

io.on("connection", (socket) => {
  console.log(`Client ${socket.id} connected`);

 socket.on("message", (data) => {
  const { username, message, hash } = data;

  console.log("Hash received by server:", hash);

  io.emit("message", { username, message, hash });
});

  socket.on("disconnect", () => {
    console.log(`Client ${socket.id} disconnected`);
  });
});

const port = 3000;

server.listen(port, () => {
  console.log("Server running on port 3000");
});
