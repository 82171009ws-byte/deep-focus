/** Media Session API（ロック画面・通知の artwork） */
export function setupMediaSession(options: {
  title: string;
  artist?: string;
  playbackState?: MediaSessionPlaybackState;
}): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

  const origin = window.location.origin;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: options.title,
      artist: options.artist ?? "Deep Focus",
      artwork: [
        { src: `${origin}/icon.png`, sizes: "512x512", type: "image/png" },
        { src: `${origin}/icon.png`, sizes: "192x192", type: "image/png" },
        { src: `${origin}/apple-icon.png`, sizes: "180x180", type: "image/png" },
      ],
    });
    if (options.playbackState) {
      navigator.mediaSession.playbackState = options.playbackState;
    }
  } catch (err) {
    console.warn("[mediaSession] setup failed:", err);
  }
}

export function playAudioElement(
  audio: HTMLAudioElement,
  label: string,
  onSuccess?: () => void
): void {
  void audio
    .play()
    .then(() => onSuccess?.())
    .catch((err) => {
      console.warn(`[audio] ${label} play failed:`, err);
    });
}

/** タイマー開始時のユーザー操作で完了音の autoplay を解除 */
export function unlockAudioElement(audio: HTMLAudioElement, label: string): void {
  const prevVolume = audio.volume;
  try {
    audio.volume = 0;
    audio.currentTime = 0;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = prevVolume;
      })
      .catch((err) => {
        audio.volume = prevVolume;
        console.warn(`[audio] ${label} unlock failed:`, err);
      });
  } catch (err) {
    audio.volume = prevVolume;
    console.warn(`[audio] ${label} unlock error:`, err);
  }
}
