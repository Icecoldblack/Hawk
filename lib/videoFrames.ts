/** Pull a few evenly spaced JPEG frames out of a video file or recording. */
export async function extractFrames(blob: Blob, count = 3, width = 640, quality = 0.7): Promise<string[]> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await once(video, "loadedmetadata", "This video could not be read. Try an MP4 or record one here.");
    // MediaRecorder files report an infinite duration until the end has been seeked to.
    if (!Number.isFinite(video.duration)) {
      video.currentTime = 1e101;
      await once(video, "durationchange", "This video could not be read.");
      video.currentTime = 0;
      await once(video, "seeked", "This video could not be read.");
    }
    const duration = video.duration;
    if (!(duration > 0)) throw new Error("This video is empty.");

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      video.currentTime = Math.min(duration - 0.05, duration * ((i + 1) / (count + 1)));
      await once(video, "seeked", "This video could not be read.");
      const scale = Math.min(1, width / (video.videoWidth || width));
      canvas.width = Math.round((video.videoWidth || width) * scale);
      canvas.height = Math.round((video.videoHeight || (width * 9) / 16) * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", quality));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function once(video: HTMLVideoElement, event: string, failure: string) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => done(new Error(failure)), 15_000);
    const onError = () => done(new Error(failure));
    const onOk = () => done();
    function done(err?: Error) {
      clearTimeout(timer);
      video.removeEventListener(event, onOk);
      video.removeEventListener("error", onError);
      if (err) reject(err);
      else resolve();
    }
    video.addEventListener(event, onOk, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}
