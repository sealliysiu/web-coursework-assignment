const socket = io();
let mySocketId = "";
let myUsername = "";
let currentRoomId = "";
let latestChallengerId = "";


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
      li.onclick = () => {
        console.log("Clicking on", name, id);
        socket.emit("challenge", id);
      }
      userList.appendChild(li);
    }
  });
});

socket.on("challengeReceived", ({ from, socketId }) => {
  latestChallengerId = socketId;
  document.getElementById("challenge-text").textContent = `${from} challenges you! Accept?`;
  new bootstrap.Modal(document.getElementById("challengeModal")).show();
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
    let names = Object.keys(finalScores);
    let scores = Object.values(finalScores);
  
    let resultText = `Game Over!\n`;
    resultText += `${names[0]}: ${scores[0]}\n`;
    resultText += `${names[1]}: ${scores[1]}\n`;
  
    if (scores[0] > scores[1]) {
      resultText += `Winner: ${names[0]}`;
    } else if (scores[0] < scores[1]) {
      resultText += `Winner: ${names[1]}`;
    } else {
      resultText += `It's a tie!`;
    }
  
    alert(resultText);
  });
  
  document.getElementById("accept-btn").onclick = () => {
    socket.emit("challengeAccepted", { challengerId: latestChallengerId });
    bootstrap.Modal.getInstance(document.getElementById("challengeModal")).hide();
  };
  