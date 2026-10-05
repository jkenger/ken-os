// An effect keeps something outside React in step with what this render shows. List every value from the render that
// the effect reads (here roomId and serverUrl), and return a cleanup that undoes the setup. React then runs the cleanup
// and the setup again whenever one of those values changes, and the cleanup alone on unmount. [] means "these never
// change", which was false; no array at all means "after every render".
function ChatRoom({ roomId, serverUrl }, { useEffect }) {
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.connect();
    return () => connection.disconnect();
  }, [serverUrl, roomId]);
}
