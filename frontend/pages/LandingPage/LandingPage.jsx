
import "./style/LandingPage.css";
import Navbar from "../Navbar/tampilan/Navbar";
import FeatureSection from "./components/FeatureSection/tampilan/FeatureSection";
import FrameCollection from "./components/FrameCollection/tampilan/FrameCollection";

// Bentuk bintang: 8 duri melengkung, panjang tidak sama
const STAR_PATH =
  "M185.3 166.3 Q203 136 221 47 Q203 136 207.3 170.7 " +
  "Q223.6 171.4 270 132 Q223.6 171.4 222.8 191 " +
  "Q244.6 209.2 320 222 Q244.6 209.2 217.6 219.9 " +
  "Q210.2 237.8 238 290 Q210.2 237.8 195 233.6 " +
  "Q178.7 258.8 163 340 Q178.7 258.8 172.5 229.2 " +
  "Q156.4 227.3 110 265 Q156.4 227.3 157 208.2 " +
  "Q136.2 189.5 62 175 Q136.2 189.5 162.7 179.8 " +
  "Q169.4 161.4 141 108 Q169.4 161.4 185.3 166.3 Z";

export default function LandingPage({
  onGetStarted,
  onSelfPhoto,
  onColabPhoto,
}) {
  return (
    <main className="landing-page">
      <Navbar />

      <section className="reference-hero" id="home">
        {/* LEFT: PHOTOBOOTH IMAGE */}
        <div className="reference-art">
          <img
            src="/images/photobooth.png"
            alt="LOOMI photobooth illustration"
            className="photobooth-image"
          />

          {/* SPARKLE KUNING */}
          <svg
            className="hero-sparkle sparkle-yellow"
            viewBox="55 40 272 308"
            aria-hidden="true"
          >
            <path
              d={STAR_PATH}
              fill="#f3e8b5"
              stroke="#652b2b"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
          </svg>

          {/* PHOTO STRIPS */}
          <img
            src="/images/PhotoStrip(Y).png"
            alt=""
            aria-hidden="true"
            className="photo-strip photo-strip-yellow"
          />

          <img
            src="/images/PhotoStrip(M).png"
            alt=""
            aria-hidden="true"
            className="photo-strip photo-strip-pink"
          />
        </div>

        {/* RIGHT: HERO TEXT */}
        <div className="reference-copy">
          <h1>
            <span className="hero-line-1">
              Capture moments,
            </span>

            <span className="hero-line-2">
              wherever you are.

              {/* SPARKLE MERAH */}
              <svg
                className="hero-sparkle sparkle-red"
                viewBox="55 40 272 308"
                aria-hidden="true"
              >
                <g transform="rotate(-20 190 200)">
                  <path
                    d={STAR_PATH}
                    fill="#f9d3d8"
                    stroke="#652b2b"
                    strokeWidth="7"
                    strokeLinejoin="round"
                  />

                  <path
                    d={STAR_PATH}
                    transform="translate(190 200) scale(0.55) translate(-190 -200)"
                    fill="#fdeaec"
                    stroke="#652b2b"
                    strokeWidth="5"
                    strokeLinejoin="round"
                  />

                  <path
                    d={STAR_PATH}
                    transform="translate(190 200) scale(0.2) translate(-190 -200)"
                    fill="#f3e08a"
                    stroke="#8a4a3f"
                    strokeWidth="12"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
            </span>
          </h1>

          <p>
            Whether you're taking a photo by yourself or sharing the
            moment with someone far away, Loomi lets you capture it
            together, customize every frame, and turn simple snapshots
            into memories that feel a little more special.
          </p>

          <button
            type="button"
            className="reference-button"
            onClick={onGetStarted}
          >
            CAPTURE A MOMENT
          </button>
        </div>
      </section>

      <FeatureSection
        onSelfPhoto={onSelfPhoto}
        onColabPhoto={onColabPhoto}
      />

      <FrameCollection />
    </main>
  );
}
