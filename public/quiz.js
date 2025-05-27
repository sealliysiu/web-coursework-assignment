const socket = io();
let mySocketId = "";
let myUsername = "";
let currentRoomId = "";

document.getElementById("submit-name").onclick = () => {
  myUsername = document.getElementById("username").value.trim();
  if (myUsername) {
    socket.emit("join", myUsername);
    document.getElementById("login").style.display = "none";
    document.getElementById("lobby").style.display = "block";
  }
};

socket.on("connect", () => {
  mySocketId = socket.id;
});

socket.on("updatePlayerList", (users) => {
    console.log("Received player list:", users);
  const userList = document.getElementById("users");
  userList.innerHTML = "";

  users.forEach(({ name, id }) => {
    if (name !== myUsername) {
      const li = document.createElement("li");
      li.textContent = name;
      li.dataset.id = id;
      li.onclick = () => 
        console.log("Clicking on", name, id);
        socket.emit("challenge", id);
      userList.appendChild(li);
    }
  });
});

socket.on("challengeReceived", ({ from, socketId }) => {
  if (confirm(`${from} challenges you! Accept?`)) {
    socket.emit("challengeAccepted", { challengerId: socketId });
  }
});

socket.on("startGame", ({ roomId }) => {
  currentRoomId = roomId;
  alert(`Game started in room: ${roomId}`);
});

socket.on("showQuestion", ({ question, options }) => {
  displayQuestion(question, options);
});

function displayQuestion(q, opts) {
  const qBox = document.getElementById("question-box");
  qBox.innerHTML = `<h3>${q}</h3>`;
  opts.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.innerText = opt;
    btn.onclick = () => {
      const time = Date.now();
      socket.emit("submitAnswer", {
        roomId: currentRoomId,
        player: myUsername,
        answerIndex: i,
        time,
      });
    };
    qBox.appendChild(btn);
  });
}

socket.on("roundResult", ({ correct, scores }) => {
  alert(`Correct answer index: ${correct}\nScores: ${JSON.stringify(scores)}`);
});

socket.on("gameOver", ({ finalScores }) => {
  alert(`Game Over!\nFinal Scores: ${JSON.stringify(finalScores)}`);
});
