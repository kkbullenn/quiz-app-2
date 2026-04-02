// QuizWebSocketHandler.cs
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

public static class QuizWebSocketHandler
{
    private static readonly ConcurrentDictionary<string, ConcurrentBag<WebSocket>> Rooms = new();

    public static async Task HandleAsync(WebSocket ws)
    {
        var buffer = new byte[4096];

        try
        {
            while (ws.State == WebSocketState.Open)
            {
                var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closed", CancellationToken.None);
                    break;
                }

                var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                var msg = JsonSerializer.Deserialize<QuizMessage>(json);

                if (msg != null)
                    await RouteMessage(ws, msg);
            }
        }
        catch (WebSocketException ex)
        {
            Console.WriteLine($"WS error: {ex.Message}");
        }
        finally
        {
            HandleDisconnect(ws);
        }
    }

    private static async Task RouteMessage(WebSocket ws, QuizMessage msg)
    {
        switch (msg.Type)
        {
            case "join_room":
                await JoinRoom(ws, msg.RoomId!);
                break;

            case "answer":
                await Broadcast(msg.RoomId!, new QuizMessage
                {
                    Type = "player_answered",
                    Answer = msg.Answer
                }, exclude: ws);
                break;
        }
    }

    private static async Task JoinRoom(WebSocket ws, string roomId)
    {
        Rooms.GetOrAdd(roomId, _ => new ConcurrentBag<WebSocket>()).Add(ws);

        var count = Rooms[roomId].Count(s => s.State == WebSocketState.Open);

        await Send(ws, new QuizMessage { Type = "joined", RoomId = roomId, PlayerCount = count });
        await Broadcast(roomId, new QuizMessage { Type = "player_joined", RoomId = roomId, PlayerCount = count }, exclude: ws);
    }

    private static void HandleDisconnect(WebSocket ws)
    {
        foreach (var (roomId, sockets) in Rooms)
        {
            var remaining = sockets.Where(s => s != ws && s.State == WebSocketState.Open).ToList();
            if (remaining.Count == 0)
                Rooms.TryRemove(roomId, out _);
        }
    }

    private static async Task Broadcast(string roomId, QuizMessage msg, WebSocket? exclude = null)
    {
        if (!Rooms.TryGetValue(roomId, out var sockets)) return;

        var tasks = sockets
            .Where(s => s != exclude && s.State == WebSocketState.Open)
            .Select(s => Send(s, msg));

        await Task.WhenAll(tasks);
    }

    private static async Task Send(WebSocket ws, QuizMessage msg)
    {
        var json = JsonSerializer.Serialize(msg);
        var bytes = Encoding.UTF8.GetBytes(json);
        await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
    }
}

public class QuizMessage
{
    public string Type { get; set; } = string.Empty;
    public string? RoomId { get; set; }
    public string? Answer { get; set; }
    public int? PlayerCount { get; set; }
}