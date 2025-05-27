const socket = io();
function joinGame() {
  const name = document.getElementById("nameInput").value;
  socket.emit("join", name);
  document.getElementById("login").style.display = "none";
  document.getElementById("lobby").style.display = "block";
}
socket.on("playerList", (players) => {
  const list = document.getElementById("players");
  list.innerHTML = "";
  for (let id in players) {
    const li = document.createElement("li");
    li.innerText = players[id];
    li.onclick = () => socket.emit("challenge", id);
    list.appendChild(li);
  }
});
