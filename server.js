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


let players = {}; // 存储 socket.id 到用户名的映射
let games = {};   // 当前对战 {roomId: {players, scores, ...}}

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("join", (name) => {
    players[socket.id] = name;
    updatePlayerList();
  });

  socket.on("challenge", (targetSocketId) => {
    const challenger = players[socket.id];
    io.to(targetSocketId).emit("challengeReceived", {
      from: challenger,
      socketId: socket.id,
    });
  });

  socket.on("challengeAccepted", ({ challengerId }) => {
    const roomId = `${challengerId}-${socket.id}`;
    socket.join(roomId);
    io.to(challengerId).emit("startGame", { roomId, opponent: players[socket.id] });
    socket.emit("startGame", { roomId, opponent: players[challengerId] });

    // 初始化游戏状态
    games[roomId] = {
      players: [challengerId, socket.id],
      scores: { [challengerId]: 0, [socket.id]: 0 },
      answers: {},
      currentQuestion: 0,
    };
  });

  socket.on("submitAnswer", ({ roomId, isCorrect }) => {
    const game = games[roomId];
    if (!game) return;
    const playerId = socket.id;
    game.answers[playerId] = isCorrect;

    if (Object.keys(game.answers).length === 2) {
      const [p1, p2] = game.players;
      const a1 = game.answers[p1];
      const a2 = game.answers[p2];
      let message;

      if (a1 && !a2) {
        game.scores[p1] += 2;
        game.scores[p2] += 0;
        message = `${players[p1]} answered correctly first.`;
      } else if (!a1 && a2) {
        game.scores[p2] += 2;
        game.scores[p1] += 0;
        message = `${players[p2]} answered correctly first.`;
      } else if (a1 && a2) {
        game.scores[p1] += 1;
        game.scores[p2] += 1;
        message = `Both answered correctly.`;
      } else {
        message = `No one answered correctly.`;
      }

      io.to(roomId).emit("roundResult", {
        scores: game.scores,
        message,
      });

      game.answers = {};
      game.currentQuestion++;
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    updatePlayerList();
  });

  function updatePlayerList() {
    io.emit("playerList", players);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
