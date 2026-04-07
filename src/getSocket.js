let socket = null;

export function getSocket(createSocket) {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = createSocket();
  }
  console.log(socket);
  return socket;
}