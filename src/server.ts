import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const server = http.createServer();

const wss = new WebSocketServer({ server, path: "/products" });

server.listen(8080, () => {
  console.log('Server listening on http://localhost:8080/products');
});

interface Users {
  socket: WebSocket;
  username: string;
  roomId: string;
}

interface Count {
  userCount: number;
  roomId: string;
}

let rooms: Users[] = [];
let userCount: Count[] = [];
wss.on("connection", function (socket) {
  socket.on("message", (message) => {
    let msg;
    try {
      msg = JSON.parse(message.toString());
    } catch (error) {
      console.error("Invalid message received, not JSON:", message.toString());
      return;
    }

    if (!msg.type || !msg.payload) {
      console.error("Invalid message structure:", msg);
      return;
    }

    if (msg.type === "join") {
      // console.log("User joined room: " + msg.payload.roomId);
      rooms.push({
        socket: socket,
        username: msg.username,
        roomId: msg.payload.roomId,
      });

      const room = userCount.find((room) => room.roomId === msg.payload.roomId);
      if (room) {
        room.userCount += 1;
        // userCount.forEach((room) => {
        //   console.log(
        //     "Room: " + room.roomId + " User Count: " + room.userCount
        //   );
        // });
      } else {
        userCount.push({
          userCount: 1,
          roomId: msg.payload.roomId,
        });
        // userCount.forEach((room) => {
        //   console.log(
        //     "Room: " + room.roomId + " User Count: " + room.userCount
        //   );
        // });
      }

      rooms.forEach((user) => {
        if (user.roomId === msg.payload.roomId) {
          user.socket.send(
            JSON.stringify({
              type: "userCountUpdate",
              payload: {
                roomId: msg.payload.roomId,
                userCount: userCount.find(
                  (room) => room.roomId === msg.payload.roomId
                )?.userCount,
              },
            })
          );
        }
      });
    }

    if (msg.type === "chat") {
      const currentUserRoom = rooms.find((user) => user.socket === socket);
      if (!currentUserRoom) {
        console.error("User not in a room, cannot send message");
        return;
      }

      // console.log("User sent message: " + msg.payload.message);
      // console.log("Room: " + currentUserRoom?.roomId);
      // console.log("Username: " + currentUserRoom?.username);

      rooms.forEach((user) => {
        if (user.roomId === currentUserRoom?.roomId) {
          user.socket.send(
            JSON.stringify({
              type: "chat",
              payload: {
                username: currentUserRoom.username,
                message: msg.payload.message,
              },
            })
          );
          // console.log("Sent message to: " + user.username);
        }
      });
    }
  });

  socket.on("close", () => {
    const user = rooms.find((user) => user.socket === socket);
    if (user) {
      rooms = rooms.filter((user) => user.socket !== socket);
      // console.log("User left room: " + user.roomId);

      const room = userCount.find((room) => room.roomId === user.roomId);
      if (room) {
        room.userCount -= 1;

        if (room.userCount === 0) {
          userCount = userCount.filter((r) => r.roomId !== user.roomId);
        }

        // userCount.forEach((room) => {
        //   console.log(
        //     "Room: " + room.roomId + " User Count: " + room.userCount
        //   );
        // });
      }

      rooms.forEach((connectedUser) => {
        if (connectedUser.roomId === user.roomId) {
          connectedUser.socket.send(
            JSON.stringify({
              type: "userCountUpdate",
              payload: {
                roomId: connectedUser.roomId,
                userCount: room?.userCount
              },
            })
          );
        }
      });
    }
  });
});
