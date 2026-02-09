# Screenshot Organizer

AI-powered screenshot classifier. Scans a folder of screenshots, uses a vision LLM to understand each image, and automatically sorts them into categorized folders.

## Features

- **Vision AI Classification** - Uses GPT-4o or Claude to actually *look at* the screenshot content
- **Smart Categories** - Receipts, chats, memes, code, shopping, junk, etc.
- **Dry Run Mode** - Preview what will happen before moving any files
- **Bilingual** - English and Chinese category names and prompts
- **Copy or Move** - Choose to copy (safe) or move (clean up originals)
- **Classification Log** - Saves a JSON log of every classification decision

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set your API key
export OPENAI_API_KEY="sk-..."
# or
export ANTHROPIC_API_KEY="sk-ant-..."

# Run it
python screenshot_organizer.py /path/to/screenshots
```

## Usage

```
python screenshot_organizer.py <input_folder> [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output` | Output folder | `<input>/organized` |
| `--provider` | `openai` or `anthropic` | `openai` |
| `--api-key` | API key (or use env var) | env var |
| `--model` | Model name | `gpt-4o` / `claude-sonnet-4-20250514` |
| `-l, --language` | `en` or `zh` | `en` |
| `--dry-run` | Preview only, no file changes | off |
| `-r, --recursive` | Scan subfolders too | off |
| `--move` | Move files instead of copy | copy |

### Examples

```bash
# Preview without moving (recommended first step)
python screenshot_organizer.py ~/Screenshots --dry-run

# Chinese categories, using Claude
python screenshot_organizer.py ~/Screenshots --provider anthropic --language zh

# Move files (clean up originals) with custom output
python screenshot_organizer.py ~/Screenshots -o ~/Organized --move

# Use a cheaper/faster model
python screenshot_organizer.py ~/Screenshots --model gpt-4o-mini

# Scan subfolders recursively
python screenshot_organizer.py ~/Screenshots -r --dry-run
```

## Categories

### English (`--language en`)
| Folder | Content |
|--------|---------|
| `receipts_payments` | Purchase receipts, payment confirmations |
| `chat_conversations` | Chat messages, DMs, group chats |
| `social_media` | Posts, stories, feeds |
| `memes_funny` | Memes, jokes, funny images |
| `articles_webpages` | News, blog posts, web content |
| `code_terminal` | Code snippets, terminal, IDE |
| `maps_navigation` | Maps, directions |
| `settings_system` | Phone settings, notifications |
| `photos_selfies` | Actual photos in screenshot folder |
| `shopping` | Product pages, wishlists |
| `schedules_calendars` | Calendar, timetables, reminders |
| `documents` | PDFs, notes |
| `gaming` | Game screenshots, scores |
| `junk` | Blurry, blank, accidental screenshots |
| `other` | Everything else |

### Chinese (`--language zh`)
`收据_付款` / `聊天_对话` / `社交媒体` / `表情包_搞笑` / `文章_网页` / `代码_终端` / `地图_导航` / `设置_系统` / `照片_自拍` / `购物` / `日程_日历` / `文档` / `游戏` / `垃圾` / `其他`

## How It Works

1. Scans the input folder for image files (png, jpg, webp, gif, bmp, tiff)
2. Sends each image to the vision LLM with a classification prompt
3. The model returns a category and brief reason
4. Files are copied/moved into category subfolders
5. A `classification_log.json` is saved with all decisions

## Output Structure

```
organized/
  receipts_payments/
    IMG_001.png
    IMG_042.png
  chat_conversations/
    IMG_003.png
  junk/
    IMG_007.png
    IMG_015.png
  classification_log.json
```

## Cost Estimate

Using GPT-4o with `detail: low`, each image costs roughly ~$0.003. For 1000 screenshots, that's about $3.

Using `gpt-4o-mini` is even cheaper at roughly ~$0.001 per image ($1 per 1000 screenshots).

## Also in this repo

- `sweep_sample.ipynb` - WandB hyperparameter sweep example (requires WandB 0.22.2+)
