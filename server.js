const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let players = {};  // socket.id -> name
let sockets = {};  // name -> socket.id

io.on("connection", (socket) => {
  console.log(`🔌 New connection: ${socket.id}`);

  // 设置用户名
  socket.on("join", (name) => {
    players[socket.id] = name;
    sockets[name] = socket.id;
    broadcastPlayerList();
  });

  // 玩家发起挑战
  socket.on("challenge", (targetSocketId) => {
    const challenger = players[socket.id];
    io.to(targetSocketId).emit("challengeReceived", {
      from: challenger,
      socketId: socket.id,
    });
  });

  // 挑战被接受
  socket.on("challengeAccepted", ({ challengerId }) => {
    const roomId = `room-${challengerId}-${socket.id}`;
    socket.join(roomId);
    io.to(challengerId).emit("challengeAccepted", { roomId });
    io.to(challengerId).socketsJoin(roomId);

    // 可以立即广播开始游戏
    io.to(roomId).emit("startGame", { roomId });
  });

  // 断开连接
  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    const name = players[socket.id];
    delete players[socket.id];
    delete sockets[name];
    broadcastPlayerList();
  });

  function broadcastPlayerList() {
    const list = Object.values(players);
    io.emit("updatePlayerList", list);
  }
});

server.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
