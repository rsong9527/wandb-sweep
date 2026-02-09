#!/usr/bin/env python3
"""
Screenshot Organizer - AI-powered screenshot classifier.

Scans a folder of screenshots, uses a vision LLM (OpenAI GPT-4o or Anthropic Claude)
to understand each image's content, then automatically creates folders and moves
files into the right category.

Usage:
    python screenshot_organizer.py /path/to/screenshots
    python screenshot_organizer.py /path/to/screenshots --provider anthropic
    python screenshot_organizer.py /path/to/screenshots --dry-run
    python screenshot_organizer.py /path/to/screenshots --language zh
"""

import argparse
import base64
import json
import os
import shutil
import sys
from pathlib import Path

from tqdm import tqdm

# ---------------------------------------------------------------------------
# Supported image extensions
# ---------------------------------------------------------------------------
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"}

# ---------------------------------------------------------------------------
# Default categories (English / Chinese)
# ---------------------------------------------------------------------------
DEFAULT_CATEGORIES_EN = [
    "receipts_payments",      # Purchase receipts, payment confirmations, invoices
    "chat_conversations",     # Chat messages, DMs, group chats
    "social_media",           # Posts, stories, feeds from social apps
    "memes_funny",            # Memes, jokes, funny images
    "articles_webpages",      # News, blog posts, web content
    "code_terminal",          # Code snippets, terminal output, IDE screenshots
    "maps_navigation",        # Maps, directions, location screenshots
    "settings_system",        # Phone settings, system info, notifications
    "photos_selfies",         # Actual photos/selfies accidentally in screenshots
    "shopping",               # Product pages, wishlists, shopping carts
    "schedules_calendars",    # Calendar events, timetables, reminders
    "documents",              # PDFs, notes, documents
    "gaming",                 # Game screenshots, scores
    "junk",                   # Blurry, accidental, blank, or useless screenshots
    "other",                  # Anything that doesn't fit above
]

DEFAULT_CATEGORIES_ZH = [
    "收据_付款",
    "聊天_对话",
    "社交媒体",
    "表情包_搞笑",
    "文章_网页",
    "代码_终端",
    "地图_导航",
    "设置_系统",
    "照片_自拍",
    "购物",
    "日程_日历",
    "文档",
    "游戏",
    "垃圾",
    "其他",
]

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------
SYSTEM_PROMPT_EN = """\
You are a screenshot classifier. The user will show you a screenshot image.
Your job is to classify it into EXACTLY ONE of the following categories:

{categories}

Rules:
1. Respond with ONLY a JSON object: {{"category": "<category_name>", "reason": "<brief reason>"}}
2. The "category" value MUST be one of the categories listed above, exactly as written.
3. If the screenshot is blurry, blank, accidental, or has no useful content, classify it as "junk".
4. Keep the reason short (under 15 words).
"""

SYSTEM_PROMPT_ZH = """\
你是一个截图分类器。用户会给你一张截图。
你需要把它归到以下类别中的一个：

{categories}

规则：
1. 只返回一个 JSON 对象：{{"category": "<类别名>", "reason": "<简短原因>"}}
2. "category" 的值必须是上面列出的类别之一，完全一致。
3. 如果截图模糊、空白、误触或没有有用内容，归类为"垃圾"。
4. 原因不超过15个字。
"""


# ---------------------------------------------------------------------------
# Image encoding helper
# ---------------------------------------------------------------------------
def encode_image_to_base64(image_path: str) -> str:
    """Read an image file and return its base64-encoded string."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def get_mime_type(image_path: str) -> str:
    """Return the MIME type based on file extension."""
    ext = Path(image_path).suffix.lower()
    mime_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff",
    }
    return mime_map.get(ext, "image/png")


# ---------------------------------------------------------------------------
# LLM Providers
# ---------------------------------------------------------------------------
class OpenAIClassifier:
    """Classify screenshots using OpenAI GPT-4o vision."""

    def __init__(self, api_key: str, model: str = "gpt-4o"):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def classify(self, image_path: str, system_prompt: str) -> dict:
        b64 = encode_image_to_base64(image_path)
        mime = get_mime_type(image_path)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Please classify this screenshot."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime};base64,{b64}",
                                "detail": "low",  # save tokens
                            },
                        },
                    ],
                },
            ],
            max_tokens=200,
            temperature=0,
        )

        return self._parse_response(response.choices[0].message.content)

    @staticmethod
    def _parse_response(text: str) -> dict:
        """Extract JSON from the model response."""
        text = text.strip()
        # Handle markdown code blocks
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON in the text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(text[start:end])
            return {"category": "other", "reason": "Failed to parse model response"}


class AnthropicClassifier:
    """Classify screenshots using Anthropic Claude vision."""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        from anthropic import Anthropic
        self.client = Anthropic(api_key=api_key)
        self.model = model

    def classify(self, image_path: str, system_prompt: str) -> dict:
        b64 = encode_image_to_base64(image_path)
        mime = get_mime_type(image_path)

        response = self.client.messages.create(
            model=self.model,
            max_tokens=200,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime,
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": "Please classify this screenshot."},
                    ],
                }
            ],
            temperature=0,
        )

        return self._parse_response(response.content[0].text)

    @staticmethod
    def _parse_response(text: str) -> dict:
        """Extract JSON from the model response."""
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(text[start:end])
            return {"category": "other", "reason": "Failed to parse model response"}


# ---------------------------------------------------------------------------
# Core organizer logic
# ---------------------------------------------------------------------------
def collect_images(folder: str) -> list[str]:
    """Collect all image files from the given folder (non-recursive by default)."""
    folder_path = Path(folder)
    images = []
    for f in sorted(folder_path.iterdir()):
        if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS:
            images.append(str(f))
    return images


def collect_images_recursive(folder: str) -> list[str]:
    """Collect all image files recursively."""
    folder_path = Path(folder)
    images = []
    for f in sorted(folder_path.rglob("*")):
        if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS:
            images.append(str(f))
    return images


def organize_screenshots(
    input_folder: str,
    output_folder: str | None = None,
    provider: str = "openai",
    api_key: str | None = None,
    model: str | None = None,
    language: str = "en",
    dry_run: bool = False,
    recursive: bool = False,
) -> dict:
    """
    Main function: classify and organize screenshots.

    Args:
        input_folder:  Path to folder containing screenshots.
        output_folder: Where to put organized files. Defaults to input_folder/organized.
        provider:      "openai" or "anthropic".
        api_key:       API key. Falls back to env vars OPENAI_API_KEY / ANTHROPIC_API_KEY.
        model:         Model name override.
        language:      "en" or "zh" for prompt/category language.
        dry_run:       If True, only print what would happen without copying files.
        recursive:     If True, scan subfolders too.

    NOTE: This tool ONLY tags/copies. Original files are NEVER deleted or moved.

    Returns:
        dict with stats: {category: count, ...}
    """
    # Resolve API key
    if api_key is None:
        env_var = "OPENAI_API_KEY" if provider == "openai" else "ANTHROPIC_API_KEY"
        api_key = os.environ.get(env_var)
        if not api_key:
            print(f"Error: No API key provided. Set {env_var} or use --api-key.")
            sys.exit(1)

    # Choose categories and prompt
    if language == "zh":
        categories = DEFAULT_CATEGORIES_ZH
        system_prompt = SYSTEM_PROMPT_ZH.format(categories="\n".join(f"- {c}" for c in categories))
    else:
        categories = DEFAULT_CATEGORIES_EN
        system_prompt = SYSTEM_PROMPT_EN.format(categories="\n".join(f"- {c}" for c in categories))

    # Initialize classifier
    if provider == "openai":
        default_model = model or "gpt-4o"
        classifier = OpenAIClassifier(api_key=api_key, model=default_model)
    elif provider == "anthropic":
        default_model = model or "claude-sonnet-4-20250514"
        classifier = AnthropicClassifier(api_key=api_key, model=default_model)
    else:
        print(f"Error: Unknown provider '{provider}'. Use 'openai' or 'anthropic'.")
        sys.exit(1)

    # Collect images
    if recursive:
        images = collect_images_recursive(input_folder)
    else:
        images = collect_images(input_folder)

    if not images:
        print(f"No images found in {input_folder}")
        return {}

    print(f"Found {len(images)} images to classify.")
    print("NOTE: Tag-only mode. Originals will NOT be deleted or moved.\n")

    # Output folder
    if output_folder is None:
        output_folder = str(Path(input_folder) / "organized")

    # Track stats
    stats: dict[str, int] = {}
    results: list[dict] = []

    # Classify each image
    for img_path in tqdm(images, desc="Classifying", unit="img"):
        filename = Path(img_path).name
        try:
            result = classifier.classify(img_path, system_prompt)
            category = result.get("category", "other")
            reason = result.get("reason", "")

            # Validate category
            if category not in categories:
                # Try fuzzy match
                matched = False
                for cat in categories:
                    if cat.lower() in category.lower() or category.lower() in cat.lower():
                        category = cat
                        matched = True
                        break
                if not matched:
                    category = "other" if language == "en" else "其他"

        except Exception as e:
            category = "other" if language == "en" else "其他"
            reason = f"Error: {e}"

        stats[category] = stats.get(category, 0) + 1
        results.append({
            "file": filename,
            "category": category,
            "reason": reason,
        })

        # Copy file into tagged folder (originals are NEVER deleted)
        dest_dir = Path(output_folder) / category
        dest_path = dest_dir / filename

        if dry_run:
            tqdm.write(f"  [TAG] {filename} -> {category}/ ({reason})")
        else:
            dest_dir.mkdir(parents=True, exist_ok=True)
            # Handle name collision
            if dest_path.exists():
                stem = dest_path.stem
                suffix = dest_path.suffix
                counter = 1
                while dest_path.exists():
                    dest_path = dest_dir / f"{stem}_{counter}{suffix}"
                    counter += 1

            shutil.copy2(img_path, dest_path)
            tqdm.write(f"  {filename} -> {category}/ ({reason})")

    # Print summary
    print("\n" + "=" * 50)
    if language == "zh":
        print("分类完成！统计结果：")
    else:
        print("Done! Summary:")
    print("=" * 50)

    for cat in sorted(stats.keys(), key=lambda x: stats[x], reverse=True):
        print(f"  {cat}: {stats[cat]} files")

    print(f"\n  Total: {len(images)} files")
    if dry_run:
        if language == "zh":
            print("\n  [试运行模式] 没有文件被复制。去掉 --dry-run 来真正执行。")
        else:
            print("\n  [DRY RUN] No files were copied. Remove --dry-run to execute.")
    else:
        if language == "zh":
            print(f"\n  文件已标签归类到: {output_folder}")
            print("  原始文件未做任何改动。")
        else:
            print(f"\n  Files tagged into: {output_folder}")
            print("  Original files were NOT modified or deleted.")

    # Save classification log
    if not dry_run:
        log_path = Path(output_folder) / "classification_log.json"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(log_path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        if language == "zh":
            print(f"  分类日志已保存: {log_path}")
        else:
            print(f"  Classification log saved: {log_path}")

    return stats


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Screenshot Organizer - AI-powered screenshot classifier",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
NOTE: This tool only TAGS (copies into folders). Originals are NEVER deleted.

Examples:
  # Basic usage (OpenAI, English)
  python screenshot_organizer.py ~/Screenshots

  # Preview without copying files
  python screenshot_organizer.py ~/Screenshots --dry-run

  # Use Claude with Chinese labels
  python screenshot_organizer.py ~/Screenshots --provider anthropic --language zh

  # Custom output folder and model
  python screenshot_organizer.py ~/Screenshots -o ~/Organized --model gpt-4o-mini

  # Scan subfolders too
  python screenshot_organizer.py ~/Screenshots --recursive
""",
    )

    parser.add_argument(
        "input_folder",
        help="Path to folder containing screenshots",
    )
    parser.add_argument(
        "-o", "--output",
        help="Output folder (default: <input_folder>/organized)",
        default=None,
    )
    parser.add_argument(
        "--provider",
        choices=["openai", "anthropic"],
        default="openai",
        help="LLM provider (default: openai)",
    )
    parser.add_argument(
        "--api-key",
        help="API key (or set OPENAI_API_KEY / ANTHROPIC_API_KEY env var)",
        default=None,
    )
    parser.add_argument(
        "--model",
        help="Model name (default: gpt-4o for OpenAI, claude-sonnet-4-20250514 for Anthropic)",
        default=None,
    )
    parser.add_argument(
        "--language", "-l",
        choices=["en", "zh"],
        default="en",
        help="Language for categories and prompts (default: en)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview classification without copying files",
    )
    parser.add_argument(
        "--recursive", "-r",
        action="store_true",
        help="Scan subfolders recursively",
    )

    args = parser.parse_args()

    # Validate input folder
    if not Path(args.input_folder).is_dir():
        print(f"Error: '{args.input_folder}' is not a valid directory.")
        sys.exit(1)

    organize_screenshots(
        input_folder=args.input_folder,
        output_folder=args.output,
        provider=args.provider,
        api_key=args.api_key,
        model=args.model,
        language=args.language,
        dry_run=args.dry_run,
        recursive=args.recursive,
    )


if __name__ == "__main__":
    main()
