# Chat on Second Screen for Twitch

🇫🇷 [Version française](README.fr.md)

Watch Twitch streams in fullscreen on one monitor while the live chat opens automatically on your second screen.

A lightweight Chrome / Edge extension (Manifest V3). It doesn't rebuild the chat: it opens Twitch's own pop-out chat, so you stay signed in and can read and type as usual while the stream stays in fullscreen.

> **Not affiliated with Twitch or Amazon.** This is an independent project. "Twitch" is a trademark of Twitch Interactive, Inc.

## Features

- **One-click setup.** A button on any channel page (or <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd>) opens the pop-out chat maximized on your other screen, then puts the player in fullscreen.
- **Smart screen choice.** The chat goes to a different screen than the stream. Mirrored or disabled displays are ignored.
- **Remembers your setup.** You can pin the chat to a specific screen from the toolbar menu. If that screen is unplugged, the extension falls back to automatic.
- **Reuses the chat window.** Switching channels updates the existing chat window instead of opening a new one.
- **Single-screen friendly.** The chat still opens in its own window, and you get a notice to use <kbd>Alt</kbd>+<kbd>Tab</kbd>.
- **Fullscreen recovery.** If fullscreen ends, a "Back to fullscreen" button appears.
- **20 languages,** following your browser's language, including right-to-left support for Arabic.
- **Minimal permissions:** `system.display` (list your screens), `storage` (remember the chosen screen), and access to `www.twitch.tv` only. No tracking, no external servers.

## Installation

### From the release ZIP

1. Download `twitch-chat-second-screen.zip` from the [Releases](../../releases) page.
2. Unzip it into a folder you'll keep. The browser loads the extension from that folder.
3. Follow the steps below from step 2.

### Load unpacked (from source)

1. Download or clone this repository.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the folder that contains `manifest.json`.
5. Optional: pin the extension from the puzzle-piece 🧩 menu.
6. Reload any Twitch tab that was already open.

## Usage

1. Open a channel page, e.g. `https://www.twitch.tv/channel-name`.
2. Do one of the following:
   - click the purple **"Chat on other screen"** button at the top right of the player;
   - press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd>;
   - click the extension icon, then **"Open chat on the other screen"**.
3. The chat opens maximized on your other screen, and the stream goes fullscreen.
   - From the toolbar menu, browsers don't allow fullscreen to start on its own, so a **"Go fullscreen"** button appears on the Twitch page. Click it.
4. Click into the chat window on the other screen to type. The stream stays in fullscreen.

**Choosing the chat screen:** click the extension icon. Under "Chat screen", pick **Automatic** or a specific screen. Your choice is saved, and the screen showing the stream is labeled.

## Languages

English, French, Spanish, Portuguese (Brazil), German, Italian, Russian, Chinese (Simplified), Chinese (Traditional), Japanese, Korean, Arabic, Hindi, Bengali, Indonesian, Turkish, Polish, Ukrainian, Vietnamese, Dutch.

The translations live in `_locales/<code>/messages.json`. To add a language, copy `_locales/en/messages.json` and translate every `message`. Keep the `$1`, `$2`, `$3` placeholders and keep `extDescription` within 132 characters. Then run the checker:

```powershell
powershell -ExecutionPolicy Bypass -File tests\verifier-langues.ps1
```

## Project structure

| Path | Purpose |
|---|---|
| `manifest.json` | Extension manifest (MV3) |
| `_locales/` | UI strings, one folder per language |
| `service-worker.js` | Opens or moves the chat window onto the chosen screen and maximizes it |
| `content.js`, `content.css` | Button on Twitch pages, keyboard shortcut, fullscreen, notifications |
| `popup.html`, `popup.js`, `popup.css` | Toolbar menu |
| `lib/ecrans.js` | Pure logic: screen selection and Twitch URL parsing (unit-tested) |
| `icons/` | Icons |
| `tests/` | Browser-based tests and a translation checker (not included in the release ZIP) |

## Testing

- `tests/tests.html`: open it in a browser to run the unit tests for screen selection and URL parsing.
- `tests/simulation.html` and `tests/popup-simulation.html`: simulate two monitors with a fake `chrome.*` API. Serve the extension folder over a local HTTP server to run them, and add `?lang=fr` (or any language code) to preview a translation.
- `tests/verifier-langues.ps1`: checks that every locale file is valid JSON, has the same keys and placeholders as English, and respects the store's length limits.

## License

[MIT](LICENSE)
