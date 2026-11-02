"""Tests of the parts that do not need the GPU stack. Run with `npm run test:tts`."""
import unittest

from catalog import script_fingerprint
from config import CHUNK_WORDS
from engine import Engine, split_text


def rec(*turns):
    return {"turns": [{"speaker": s, "text": t} for s, t in turns]}


class ScriptFingerprintTest(unittest.TestCase):
    # Expected values come from `scriptFingerprint` in src/app/core/audio-clips.service.ts.
    def test_matches_the_app_spec(self):
        # Same case as the `scriptFingerprint` test in src/app/core/audio-playback.spec.ts.
        self.assertEqual(script_fingerprint(rec(("a", "Café, it’s ok."))), "fbde8f34")

    def test_matches_the_app(self):
        self.assertEqual(script_fingerprint(rec(("a", "Hello."), ("b", "Hi there!"))), "20f4bf96")

    def test_matches_the_app_outside_ascii(self):
        # The emoji is two UTF-16 code units, as `charCodeAt` sees it.
        text = "The café opens at 9 — tickets cost €5. 😀"
        self.assertEqual(script_fingerprint(rec(("m", text))), "fdd408ef")


class SplitTextTest(unittest.TestCase):
    def test_keeps_a_short_turn_whole(self):
        self.assertEqual(split_text("  Hello. How are you?  "), ["Hello. How are you?"])

    def test_cuts_long_turns_at_sentence_ends(self):
        sentence = " ".join(["word"] * 15) + "."
        chunks = split_text(" ".join([sentence] * 6))
        self.assertGreater(len(chunks), 1)
        self.assertEqual(" ".join(chunks), " ".join([sentence] * 6))
        for chunk in chunks:
            self.assertTrue(chunk.endswith("."))
            self.assertLessEqual(len(chunk.split()), CHUNK_WORDS)

    def test_does_not_cut_after_titles(self):
        text = " ".join(["word"] * 38) + " Mr. Smith arrived."
        self.assertEqual(split_text(text), [text])


class SpeakerKeysTest(unittest.TestCase):
    def test_two_similar_speakers_get_different_voices(self):
        speakers = [
            {"id": "a", "voice": {"lang": "en-GB", "gender": "female"}},
            {"id": "b", "voice": {"lang": "en-GB", "gender": "female"}},
            {"id": "c", "voice": {"lang": "en-NZ", "gender": "male"}},
        ]
        keys = Engine.speaker_keys({"speakers": speakers})
        self.assertEqual(keys, {"a": ("en-GB", "female", 0), "b": ("en-GB", "female", 1),
                                "c": ("en-GB", "male", 0)})


if __name__ == "__main__":
    unittest.main()
