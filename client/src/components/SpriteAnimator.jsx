import { useEffect, useMemo, useState } from "react";

export default function SpriteAnimator({
  src,
  frameWidth = 128,
  frameHeight = 128,
  row = 0,
  frame = null,
  startFrame = 0,
  endFrame = null,
  frameCountOverride = null,
  fps = 10,
  className = "",
}) {
  const [computedFrameCount, setComputedFrameCount] = useState(1);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const totalFrames = Math.max(1, frameCountOverride ?? computedFrameCount);
  const minFrame = Math.max(0, Math.min(startFrame, totalFrames - 1));
  const maxFrame = Math.max(
    minFrame,
    Math.min(endFrame ?? totalFrames - 1, totalFrames - 1),
  );
  const clampedFixedFrame = frame == null ? null : Math.max(minFrame, Math.min(frame, maxFrame));

  useEffect(() => {
    let isMounted = true;
    const image = new Image();

    setIsLoaded(false);
    setHasError(false);
    setComputedFrameCount(1);
    setFrameIndex(0);

    image.onload = () => {
      if (!isMounted) {
        return;
      }

      const computedCount = Math.max(1, Math.floor(image.naturalWidth / frameWidth));
      setComputedFrameCount(computedCount);
      setIsLoaded(true);
    };

    image.onerror = () => {
      if (!isMounted) {
        return;
      }

      setHasError(true);
      setIsLoaded(false);
    };

    image.src = src;

    return () => {
      isMounted = false;
    };
  }, [frameWidth, src]);

  useEffect(() => {
    if (!isLoaded || hasError) {
      return;
    }

    setFrameIndex(minFrame);
  }, [hasError, isLoaded, minFrame, totalFrames]);

  useEffect(() => {
    if (!isLoaded || hasError || clampedFixedFrame != null || minFrame === maxFrame) {
      return undefined;
    }

    const frameDurationMs = Math.max(40, Math.round(1000 / fps));
    const intervalId = window.setInterval(() => {
      setFrameIndex((prev) => (prev >= maxFrame ? minFrame : prev + 1));
    }, frameDurationMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [clampedFixedFrame, fps, hasError, isLoaded, maxFrame, minFrame]);

  const spriteStyle = useMemo(
    () => ({
      width: `${frameWidth}px`,
      height: `${frameHeight}px`,
      backgroundImage: `url(${src})`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: `-${
        (clampedFixedFrame == null ? frameIndex : clampedFixedFrame) * frameWidth
      }px -${row * frameHeight}px`,
    }),
    [clampedFixedFrame, frameHeight, frameIndex, frameWidth, row, src],
  );

  if (hasError) {
    return null;
  }

  return (
    <div className={className} aria-hidden={!isLoaded} role="img" style={spriteStyle} />
  );
}
