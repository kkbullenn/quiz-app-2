(() => {
    if (!requireAuth()) return;

    const params = new URLSearchParams(window.location.search);
    const quizId = params.get("quizId");
    const quizTitle = decodeURIComponent(params.get("quizTitle") ?? "Quiz");
    const categoryName = decodeURIComponent(params.get("categoryName") ?? "");

    // Generate a room code if one wasn't provided (first player creates the lobby)
    let roomId = params.get("roomId");
    if (!roomId) {
        roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const url = new URL(window.location.href);
        url.searchParams.set("roomId", roomId);
        window.history.replaceState({}, "", url);
    }

    document.getElementById("quiz-title").textContent = quizTitle;
    document.getElementById("quiz-category").textContent = categoryName;

    // Combined code format: {quizId}-{roomId} — easy to share and parse on join
    const shareCode = quizId ? `${quizId}-${roomId}` : roomId;
    document.getElementById("room-code").textContent = shareCode;

    document.getElementById("copy-btn").addEventListener("click", () => {
        navigator.clipboard.writeText(shareCode);
        document.getElementById("copy-btn").textContent = "Copied!";
        setTimeout(() => { document.getElementById("copy-btn").textContent = "Copy"; }, 1500);
    });

    // WebSocket
    const ws = new WebSocket(`wss://${window.location.host}/ws`);

    ws.onopen = () => {
        ws.send(JSON.stringify({ Type: "join_room", RoomId: roomId }));
    };

    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.Type === "joined") {
            document.getElementById("player-count").textContent = msg.PlayerCount;
        } else if (msg.Type === "player_joined") {
            document.getElementById("player-count").textContent = msg.PlayerCount;
            addLog("A new player joined.");
        }
    };

    ws.onerror = () => addLog("Connection error — please refresh.");

    function addLog(text) {
        const entry = document.createElement("p");
        entry.className = "text-sm text-white/50";
        entry.textContent = `• ${text}`;
        document.getElementById("activity-log").appendChild(entry);
    }

    document.getElementById("start-btn").addEventListener("click", () => {
        ws.close();
        window.location.href = `/multiplayer.html?quizId=${quizId}&roomId=${encodeURIComponent(roomId)}&quizTitle=${encodeURIComponent(quizTitle)}&categoryName=${encodeURIComponent(categoryName)}`;
    });
})();
