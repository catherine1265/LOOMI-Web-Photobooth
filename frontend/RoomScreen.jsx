// Room page (/room/:code): connects to the meeting and shows the colab photo booth.
import { useEffect, useState } from "react";
import { RoomClient, loadSession } from "./roomClient.js";
import { Link } from "./ui.jsx";
import ColabRoom from "./pages/PhotoType/components/ColabRoom/ColabRoom.jsx";
import RoomMessage from "./pages/PhotoType/components/ColabRoom/RoomMessage.jsx";

export function RoomScreen({ code, frameType, onDone }) {
  const [session] = useState(() => loadSession(code));
  if (!session) {
    return (
      <RoomMessage>
        <p className="colab-room-message__title">You need the meeting password to enter this room.</p>
        <Link href={`/?join=${encodeURIComponent(code)}`} className="colab-room-message__button">
          Join meeting {code}
        </Link>
      </RoomMessage>
    );
  }
  return <ConnectedRoom session={session} frameType={frameType} onDone={onDone} />;
}

function ConnectedRoom({ session, frameType, onDone }) {
  const [client, setClient] = useState(null);

  useEffect(() => {
    const created = new RoomClient(session);
    setClient(created);
    created.connect();
    return () => {
      created.disconnect();
    };
  }, [session]);

  if (!client) {
    return (
      <RoomMessage>
        <p className="colab-room-message__title">Connecting…</p>
      </RoomMessage>
    );
  }
  return <ColabRoom client={client} frameType={frameType} onDone={onDone} />;
}
