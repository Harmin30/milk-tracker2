import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { playSuccessChime, warmupSuccessChime } from "../src/lib/sound.ts";

test("Success Chime Asset Verification", async (t) => {
  await t.test("Audio files exist in public/sounds/", () => {
    const wavPath = path.join(process.cwd(), "public", "sounds", "success-chime.wav");
    assert.strictEqual(fs.existsSync(wavPath), true, "WAV chime asset must exist");
    const stat = fs.statSync(wavPath);
    assert.ok(stat.size > 10000 && stat.size < 100000, `WAV file size (${stat.size}B) should be lightweight`);
  });

  await t.test("WAV file has correct PCM header and duration between 700-900ms", () => {
    const wavPath = path.join(process.cwd(), "public", "sounds", "success-chime.wav");
    const buffer = fs.readFileSync(wavPath);

    // RIFF chunk descriptor
    assert.strictEqual(buffer.toString("ascii", 0, 4), "RIFF");
    assert.strictEqual(buffer.toString("ascii", 8, 12), "WAVE");

    // fmt subchunk
    assert.strictEqual(buffer.toString("ascii", 12, 16), "fmt ");
    const numChannels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const bitsPerSample = buffer.readUInt16LE(34);

    assert.strictEqual(numChannels, 1, "Mono audio");
    assert.strictEqual(sampleRate, 44100, "44.1kHz sample rate");
    assert.strictEqual(bitsPerSample, 16, "16-bit PCM");

    // data subchunk
    const dataSize = buffer.readUInt32LE(40);
    const totalSamples = dataSize / (numChannels * (bitsPerSample / 8));
    const durationMs = (totalSamples / sampleRate) * 1000;

    assert.ok(
      durationMs >= 700 && durationMs <= 900,
      `Duration ${durationMs}ms must be between 700ms and 900ms`,
    );
  });

  await t.test("warmupSuccessChime and playSuccessChime do not throw in non-browser or fallback environments", async () => {
    assert.doesNotThrow(() => {
      warmupSuccessChime();
    });

    await assert.doesNotReject(async () => {
      await playSuccessChime();
    });
  });

  await t.test("Simulated DOM Audio playback and cooldown guard", async () => {
    let playCount = 0;
    let loadCount = 0;

    // Mock window & Audio in test environment
    globalThis.window = {
      AudioContext: class MockAudioContext {
        state = "running";
        resume = async () => {};
        createGain = () => ({
          connect: () => {},
          gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        });
        createOscillator = () => ({
          type: "sine",
          frequency: { setValueAtTime: () => {} },
          connect: () => {},
          start: () => {},
          stop: () => {},
        });
        destination = {};
        currentTime = 0;
      },
    };

    globalThis.Audio = class MockAudio {
      src = "";
      preload = "";
      volume = 1;
      currentTime = 0;
      constructor(src) {
        this.src = src;
      }
      load() {
        loadCount++;
      }
      async play() {
        playCount++;
        return Promise.resolve();
      }
    };

    warmupSuccessChime();
    assert.strictEqual(loadCount, 1, "Audio element should be preloaded");

    await playSuccessChime();
    assert.strictEqual(playCount, 1, "Chime played once");

    // Immediate second call should be ignored by cooldown guard
    await playSuccessChime();
    assert.strictEqual(playCount, 1, "Rapid double call suppressed by cooldown");

    delete globalThis.window;
    delete globalThis.Audio;
  });
});

