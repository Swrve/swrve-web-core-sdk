import { attachVideoEventHandlers } from "../src/Campaigns/Messages/HTMLSwrveImageElement";

function makeVideo(): HTMLVideoElement {
  const video = document.createElement("video");
  // jsdom does not implement HTMLMediaElement.play(); stub it so the loop restart is observable
  video.play = jest.fn().mockResolvedValue(undefined) as any;
  return video;
}

describe("attachVideoEventHandlers", () => {
  it("does not set the native loop attribute (it suppresses the ended event)", () => {
    const video = makeVideo();
    attachVideoEventHandlers(video, true, jest.fn());
    expect(video.loop).toBe(false);
  });

  it("fires video_ended once and restarts playback when looping", () => {
    const video = makeVideo();
    const onVideoEvent = jest.fn();

    attachVideoEventHandlers(video, true, onVideoEvent);
    video.dispatchEvent(new Event("ended"));
    // after the manual restart, a subsequent end must not re-fire video_ended
    video.dispatchEvent(new Event("ended"));

    expect(onVideoEvent).toHaveBeenCalledTimes(1);
    expect(onVideoEvent).toHaveBeenCalledWith("video_ended");
    expect(video.play).toHaveBeenCalled();
  });

  it("fires video_ended without restarting when not looping", () => {
    const video = makeVideo();
    const onVideoEvent = jest.fn();

    attachVideoEventHandlers(video, false, onVideoEvent);
    video.dispatchEvent(new Event("ended"));

    expect(onVideoEvent).toHaveBeenCalledWith("video_ended");
    expect(video.play).not.toHaveBeenCalled();
  });

  it("swallows a rejected play() when restarting a looping video", async () => {
    const video = makeVideo();
    video.play = jest.fn().mockRejectedValue(new Error("interrupted")) as any;
    const onVideoEvent = jest.fn();

    attachVideoEventHandlers(video, true, onVideoEvent);

    expect(() => video.dispatchEvent(new Event("ended"))).not.toThrow();
    // let the rejected play() promise settle without an unhandled rejection
    await Promise.resolve();

    expect(onVideoEvent).toHaveBeenCalledWith("video_ended");
    expect(video.play).toHaveBeenCalled();
  });

  it("fires video_started only once on play", () => {
    const video = makeVideo();
    const onVideoEvent = jest.fn();

    attachVideoEventHandlers(video, false, onVideoEvent);
    video.dispatchEvent(new Event("play"));
    video.dispatchEvent(new Event("play"));

    expect(onVideoEvent).toHaveBeenCalledTimes(1);
    expect(onVideoEvent).toHaveBeenCalledWith("video_started");
  });
});
