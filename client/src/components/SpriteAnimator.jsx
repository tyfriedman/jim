import { useEffect, useMemo, useRef, useState } from "react";

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const spriteRef = useRef(null);

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

  const setSpriteFrame = (targetFrame) => {
    if (!spriteRef.current) {
      return;
    }

    spriteRef.current.style.backgroundPosition = `-${targetFrame * frameWidth}px -${
      row * frameHeight
    }px`;
  };

  useEffect(() => {
    if (!isLoaded || hasError) {
      return;
    }

    setSpriteFrame(clampedFixedFrame == null ? minFrame : clampedFixedFrame);
  }, [clampedFixedFrame, frameHeight, frameWidth, hasError, isLoaded, minFrame, row]);

  useEffect(() => {
    if (!isLoaded || hasError || clampedFixedFrame != null || minFrame === maxFrame) {
      return undefined;
    }

    const frameDurationMs = Math.max(40, Math.round(1000 / fps));
    let frameCursor = minFrame;
    let previousTickMs = performance.now();
    let animationFrameId = 0;

    const tick = (currentTickMs) => {
      if (currentTickMs - previousTickMs >= frameDurationMs) {
        frameCursor = frameCursor >= maxFrame ? minFrame : frameCursor + 1;
        setSpriteFrame(frameCursor);
        previousTickMs = currentTickMs;
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [clampedFixedFrame, fps, hasError, isLoaded, maxFrame, minFrame]);

  const spriteStyle = useMemo(
    () => ({
      width: `${frameWidth}px`,
      height: `${frameHeight}px`,
      backgroundImage: `url(${src})`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: `-${minFrame * frameWidth}px -${row * frameHeight}px`,
    }),
    [frameHeight, frameWidth, minFrame, row, src],
  );

  if (hasError) {
    return null;
  }

  return (
    <div ref={spriteRef} className={className} aria-hidden={!isLoaded} role="img" style={spriteStyle} />
  );
}
