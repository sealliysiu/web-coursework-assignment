// public/quiz.js
const socket = io();
let mySocketId = "";
let myUsername = "";

document.getElementById("submit-name").onclick = () => {
  myUsername = document.getElementById("username").value.trim();
  if (myUsername) {
    socket.emit("set_username", myUsername);
    document.getElementById("login").style.display = "none";
    document.getElementById("lobby").style.display = "block";
  }
};

socket.on("connect", () => {
  mySocketId = socket.id;
});

socket.on("update_user_list", (usernames) => {
  const userList = document.getElementById("users");
  userList.innerHTML = "";
  usernames.forEach((name) => {
    if (name !== myUsername) {
      const li = document.createElement("li");
      li.textContent = name;
      li.onclick = () => socket.emit("challenge", { toSocketId: li.dataset.id });
      userList.appendChild(li);
    }
  });
});

socket.on("receive_challenge", ({ fromSocketId, fromUsername }) => {
  if (confirm(`${fromUsername} challenges you! Accept?`)) {
    socket.emit("accept_challenge", { fromSocketId });
  }
});

socket.on("start_game", ({ roomId }) => {
  alert(`Game started in ${roomId}`);
});
