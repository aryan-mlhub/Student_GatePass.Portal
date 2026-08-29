"use client";

import { useEffect, useRef } from "react";

export function IntroSplashScreen() {
  const introScreenRef = useRef<HTMLDivElement | null>(null);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const introFinishedRef = useRef<boolean>(false);

  useEffect(() => {
    const introScreen = introScreenRef.current || document.getElementById("intro-screen");
    const introVideo = introVideoRef.current || (document.getElementById("intro-video") as HTMLVideoElement | null);

    function finishIntro() {
      if (introFinishedRef.current) return;
      introFinishedRef.current = true;

      if (introScreen) {
        introScreen.style.opacity = "0";
        introScreen.style.visibility = "hidden";
        setTimeout(() => {
          introScreen.style.display = "none";
        }, 600);
      }
    }

    // Expose finishIntro globally to window so inline onclick works
    (window as any).finishIntro = finishIntro;

    // Video khatam hone par ya error aane par automatic hide ho jaye
    if (introVideo) {
      introVideo.addEventListener("ended", finishIntro);
      introVideo.addEventListener("error", finishIntro);

      // Attempt to play if autoplay is permitted
      introVideo.play().catch(() => {
        // Handled silently
      });
    }

    // Fallback timer agar video load na ho ya complete ho jaye (15 seconds)
    const fallbackTimer = setTimeout(() => {
      if (!introFinishedRef.current) {
        finishIntro();
      }
    }, 15000);

    return () => {
      clearTimeout(fallbackTimer);
      if (introVideo) {
        introVideo.removeEventListener("ended", finishIntro);
      }
    };
  }, []);

  return (
    <div
      ref={introScreenRef}
      id="intro-screen"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        background: "#ffffff",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        transition: "opacity 0.6s ease, visibility 0.6s ease",
      }}
    >
      <video
        ref={introVideoRef}
        id="intro-video"
        autoPlay
        muted
        playsInline
        preload="auto"
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "100vw",
          maxHeight: "100vh",
          objectFit: "contain",
        }}
      >
        <source src="/assets/gatepass2.0.mp4" type="video/mp4" />
        <source src="/assets/gatepass-intro.mp4" type="video/mp4" />
        <source src="assets/gatepass2.0.mp4" type="video/mp4" />
        <source src="assets/gatepass-intro.mp4" type="video/mp4" />
        <source src="/assets/make_this_d_pic_to_the_d_vid.mp4" type="video/mp4" />
        <source src="assets/make_this_d_pic_to_the_d_vid.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <button
        type="button"
        onClick={() => {
          if (typeof (window as any).finishIntro === "function") {
            (window as any).finishIntro();
          }
        }}
        style={{
          position: "absolute",
          bottom: "30px",
          right: "30px",
          background: "rgba(27, 42, 74, 0.85)",
          color: "#fff",
          border: "none",
          padding: "8px 18px",
          borderRadius: "99px",
          fontWeight: 600,
          cursor: "pointer",
          zIndex: 100000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        Skip Intro ✕
      </button>
    </div>
  );
}
