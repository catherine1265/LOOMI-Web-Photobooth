import "../SelfPhoto/style/SelfPhoto.css";
import "./style/ColabRoom.css";
import Navbar from "../../../Navbar/tampilan/Navbar";

export default function RoomMessage({ children }) {
  return (
    <main className="self-photo-page colab-room-page">
      <Navbar />
      <section className="colab-room-message">{children}</section>
    </main>
  );
}
