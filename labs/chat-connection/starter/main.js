function ChatRoom({ roomId, serverUrl }, { useEffect }) {
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.connect();
  }, []);
}
