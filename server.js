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
let games = {};    // roomId -> game state

const quizQuestions = [
  { question: "What is the capital of France?", options: ["Paris", "London", "Rome"], answer: 0 },
  { question: "What is 2 + 2?", options: ["3", "4", "5"], answer: 1 },
  { question: "Which planet is red?", options: ["Mars", "Earth", "Venus"], answer: 0 },
  { question: "How many days in a week?", options: ["5", "7", "10"], answer: 1 },
  { question: "What is the color of the sun?", options: ["Blue", "Yellow", "Green"], answer: 1 },
];

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("join", (name) => {
    players[socket.id] = name;
    sockets[name] = socket.id;
    console.log("Current players:", players);
    broadcastPlayerList();
  });

  socket.on("challenge", (targetSocketId) => {
    const challenger = players[socket.id];
    console.log(`${challenger} (socket ${socket.id}) is challenging ${targetSocketId}`);
    io.to(targetSocketId).emit("challengeReceived", {
      from: challenger,
      socketId: socket.id,
    });
  });

  socket.on("challengeAccepted", ({ challengerId }) => {
    const roomId = `room-${challengerId}-${socket.id}`;
    socket.join(roomId);
    io.to(challengerId).emit("challengeAccepted", { roomId });
    io.to(challengerId).socketsJoin(roomId);

    const player1 = players[challengerId];
    const player2 = players[socket.id];

    games[roomId] = {
      index: 0,
      scores: { [player1]: 0, [player2]: 0 },
      players: [player1, player2],
      answered: {},
    };

    io.to(roomId).emit("startGame", { roomId });
    sendQuestion(roomId);
  });

  socket.on("submitAnswer", ({ roomId, player, answerIndex, time }) => {
    const game = games[roomId];
    if (!game || game.answered[player]) return;

    game.answered[player] = { answerIndex, time };

    if (Object.keys(game.answered).length === 2) {
      evaluateRound(roomId);
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    const name = players[socket.id];
    delete players[socket.id];
    delete sockets[name];
    broadcastPlayerList();
  });

  function broadcastPlayerList() {
    const list = Object.entries(players).map(([id, name]) => ({ id, name }));
    io.emit("updatePlayerList", list);
  }

  function sendQuestion(roomId) {
    const game = games[roomId];
    if (!game) return;

    const current = quizQuestions[game.index];
    io.to(roomId).emit("showQuestion", {
      question: current.question,
      options: current.options,
    });
    game.answered = {};
  }

function evaluateRound(roomId) {
  const game = games[roomId];
  const correctAnswer = quizQuestions[game.index].answer;

  const [p1, p2] = game.players;
  const a1 = game.answered[p1];
  const a2 = game.answered[p2];

  let result = { [p1]: 0, [p2]: 0 };

  if (a1.answerIndex === correctAnswer && a2.answerIndex === correctAnswer) {
    result[a1.time < a2.time ? p1 : p2] = 2;
    result[a1.time > a2.time ? p1 : p2] = 1;
  } else if (a1.answerIndex === correctAnswer) {
    result[p1] = 2;
  } else if (a2.answerIndex === correctAnswer) {
    result[p2] = 2;
  }

  game.scores[p1] += result[p1];
  game.scores[p2] += result[p2];

  io.to(roomId).emit("roundResult", {
    correct: correctAnswer,
    scores: game.scores,
  });

  game.index += 1;

  if (game.index < quizQuestions.length) {
    setTimeout(() => sendQuestion(roomId), 5000);
  } else {
    let winner = "tie";
    if (game.scores[p1] > game.scores[p2]) winner = p1;
    else if (game.scores[p2] > game.scores[p1]) winner = p2;

    io.to(roomId).emit("gameOver", {
      finalScores: game.scores,
      winner,
    });
  }
}

});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
