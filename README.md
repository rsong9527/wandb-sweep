# Screenshot Extractor

AI-powered tool that reads your screenshots, extracts the text and ideas inside them, tags each one, and exports everything to a readable Markdown file. You review the export, keep what matters, then manually delete the screenshots you don't need.

**Originals are NEVER deleted or modified.**

## What It Does

1. Scans a folder of screenshots
2. Uses vision AI (GPT-4o / Claude) to **read the actual content**
3. Extracts text, generates a meaningful tag, writes a summary
4. Flags **actionable ideas** (things to follow up on)
5. Flags screenshots with **no useful text** (safe to delete)
6. Exports everything to **Markdown** and **JSON** so you can review as text

## Example Output

```
## 行动项 / 想法

- [ ] **influence idea**: Research micro-influencer collaboration model for SaaS
  (IMG_0042.png)
- [ ] **startup pitch**: Follow up on the B2B marketplace concept from the podcast
  (IMG_0078.png)

## GMAT题目 (12)
> These can probably be deleted after review

### IMG_0003.png
> GMAT quantitative question about probability

    If a fair coin is flipped 5 times, what is the probability...

## influence idea (3)
### IMG_0042.png
> Notes about influencer marketing strategy

    Key insight: micro-influencers with 5-10k followers have 3x engagement...
```

## Quick Start (Python CLI)

```bash
pip install -r requirements.txt
export OPENAI_API_KEY="sk-..."

# Preview which files will be processed
python screenshot_organizer.py ~/Screenshots --dry-run

# Extract content (Chinese output)
python screenshot_organizer.py ~/Screenshots -l zh

# Use Claude
python screenshot_organizer.py ~/Screenshots --provider anthropic -l zh
```

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output` | Output folder for exports | `<input>/extracted` |
| `--provider` | `openai` or `anthropic` | `openai` |
| `--api-key` | API key (or use env var) | env var |
| `--model` | Model name | `gpt-4o` / `claude-sonnet-4-20250514` |
| `-l, --language` | `en` or `zh` | `en` |
| `--dry-run` | Preview only, no API calls | off |
| `-r, --recursive` | Scan subfolders too | off |

### Output

After running, you get:
- `extracted/extracted_content.md` - Human-readable Markdown with all extracted text
- `extracted/extraction_log.json` - Machine-readable JSON log

The summary tells you:
- How many screenshots have useful text content
- How many have actionable ideas to follow up on
- How many have no useful content (safe to delete)

## iOS App

A React Native (Expo) app that does the same thing on your phone.

### Features
- Browse and select screenshots from your photo library
- AI extracts text and tags each screenshot
- View extracted content inline (tap to expand)
- **Export** extracted text via Share sheet (copy, send to Notes, etc.)
- Highlights actionable ideas and deletable screenshots
- Supports OpenAI and Anthropic

### Install & Run

```bash
cd ScreenshotOrganizer
npm install

# Test with Expo Go (scan QR code on phone)
npx expo start

# Build .ipa for iOS
npx expo install eas-cli
npx eas build --platform ios
```

## Cost

Using GPT-4o `detail: high` for text extraction: ~$0.01/image.
Using `gpt-4o-mini`: ~$0.002/image.
1000 screenshots ~ $2-10 depending on model.
