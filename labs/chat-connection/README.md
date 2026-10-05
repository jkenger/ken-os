`ChatRoom({ roomId, serverUrl }, { useEffect })` is a component that must stay connected to the chat room it shows.
`createConnection(serverUrl, roomId)` returns an object with `connect()` and `disconnect()`.

The tests run it in a small stand-in for React with React's `useEffect` rules: after each render, an effect runs again
only if one of its dependencies changed (`Object.is`), the previous run's cleanup runs first, and every cleanup runs
when the component unmounts.

The starter connects once with an empty dependency list and never disconnects. Switch rooms and it stays in the old
one; leave the page and the connection stays open. Fix it so that:

- Mounting connects to the room.
- Re-rendering with the same room and server does nothing.
- Changing the room or the server disconnects from the old one, then connects to the new one.
- Unmounting disconnects.

Then explain why an effect is synchronization with something outside React rather than "run once on mount", and how
`[]`, no array, and `[roomId, serverUrl]` differ.
