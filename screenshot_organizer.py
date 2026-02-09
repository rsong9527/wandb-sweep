#!/usr/bin/env python3
"""
Screenshot Extractor - Extract text & ideas from screenshots using vision AI.

Scans a folder of screenshots, uses a vision LLM to read the content,
extracts the text/ideas, tags each one, and exports everything to a
readable Markdown file so you can review and decide what to keep or delete.

Original files are NEVER deleted or modified.

Usage:
    python screenshot_organizer.py ~/Screenshots
    python screenshot_organizer.py ~/Screenshots --provider anthropic
    python screenshot_organizer.py ~/Screenshots --dry-run
"""

import argparse
import base64
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from tqdm import tqdm

# ---------------------------------------------------------------------------
# Supported image extensions
# ---------------------------------------------------------------------------
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"}

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------
SYSTEM_PROMPT_EN = """\
You are a screenshot content extractor. The user will show you a screenshot.

Your job:
1. Read ALL text visible in the screenshot.
2. Figure out what kind of content this is.
3. Extract the key information / ideas.

Respond with ONLY a JSON object:
{
  "tag": "<short tag, 1-4 words, e.g. 'GMAT question', 'business idea', 'recipe', 'meme', 'flight booking'>",
  "has_useful_text": true/false,
  "extracted_text": "<the actual text content from the screenshot, faithfully transcribed>",
  "summary": "<1-2 sentence summary of what this screenshot contains>",
  "actionable": "<if there's an idea/todo/action item, state it clearly, otherwise empty string>"
}

Rules:
- "tag" should be a meaningful short label based on the ACTUAL content (not generic categories).
- "has_useful_text" = false for memes, blank screenshots, UI-only screenshots with no readable text.
- "extracted_text" should capture the important text as-is. Don't paraphrase, extract it.
- If there are multiple ideas or items, list them all in extracted_text.
- Keep "summary" concise.
- "actionable" is for ideas, todos, things to follow up on. Leave empty if none.
"""

SYSTEM_PROMPT_ZH = """\
你是一个截图内容提取器。用户会给你一张截图。

你的任务：
1. 读取截图中所有可见的文字。
2. 判断这是什么类型的内容。
3. 提取关键信息和想法。

只返回一个 JSON 对象：
{
  "tag": "<简短标签，1-4个词，例如 'GMAT题目', '创业想法', '菜谱', '表情包', '航班预订'>",
  "has_useful_text": true/false,
  "extracted_text": "<截图中的实际文字内容，忠实提取>",
  "summary": "<1-2句话概括截图内容>",
  "actionable": "<如果有想法/待办/需要跟进的事，写清楚，否则留空>"
}

规则：
- "tag" 要根据实际内容起一个有意义的短标签（不要用笼统的分类）。
- "has_useful_text" 如果是纯表情包、空白截图、没有可读文字的UI截图，设为 false。
- "extracted_text" 要原文提取重要文字，不要改写。
- 如果有多个想法或条目，全部列出。
- "summary" 要简洁。
- "actionable" 是给想法、待办、需要跟进的事用的，没有就留空。
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
def _parse_json_response(text: str) -> dict:
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
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
        return {
            "tag": "parse_error",
            "has_useful_text": False,
            "extracted_text": "",
            "summary": "Failed to parse model response",
            "actionable": "",
        }


class OpenAIExtractor:
    """Extract screenshot content using OpenAI GPT-4o vision."""

    def __init__(self, api_key: str, model: str = "gpt-4o"):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def extract(self, image_path: str, system_prompt: str) -> dict:
        b64 = encode_image_to_base64(image_path)
        mime = get_mime_type(image_path)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract the content from this screenshot."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime};base64,{b64}",
                                "detail": "high",
                            },
                        },
                    ],
                },
            ],
            max_tokens=1000,
            temperature=0,
        )

        return _parse_json_response(response.choices[0].message.content)


class AnthropicExtractor:
    """Extract screenshot content using Anthropic Claude vision."""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        from anthropic import Anthropic
        self.client = Anthropic(api_key=api_key)
        self.model = model

    def extract(self, image_path: str, system_prompt: str) -> dict:
        b64 = encode_image_to_base64(image_path)
        mime = get_mime_type(image_path)

        response = self.client.messages.create(
            model=self.model,
            max_tokens=1000,
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
                        {"type": "text", "text": "Extract the content from this screenshot."},
                    ],
                }
            ],
            temperature=0,
        )

        return _parse_json_response(response.content[0].text)


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------
def collect_images(folder: str, recursive: bool = False) -> list[str]:
    """Collect all image files from the given folder."""
    folder_path = Path(folder)
    if recursive:
        files = sorted(folder_path.rglob("*"))
    else:
        files = sorted(folder_path.iterdir())
    return [str(f) for f in files if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS]


def export_markdown(results: list[dict], output_path: str, language: str = "en") -> None:
    """Export extracted content to a readable Markdown file."""
    is_zh = language == "zh"
    lines = []

    lines.append(f"# {'截图内容提取' if is_zh else 'Screenshot Content Extraction'}")
    lines.append(f"")
    lines.append(f"{'生成时间' if is_zh else 'Generated'}: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"{'总计' if is_zh else 'Total'}: {len(results)} {'张截图' if is_zh else 'screenshots'}")
    lines.append(f"")

    # Group by tag
    by_tag: dict[str, list[dict]] = {}
    for r in results:
        tag = r.get("tag", "other")
        by_tag.setdefault(tag, []).append(r)

    # Sort tags: most items first
    sorted_tags = sorted(by_tag.keys(), key=lambda t: len(by_tag[t]), reverse=True)

    # Table of contents
    lines.append(f"## {'目录' if is_zh else 'Table of Contents'}")
    lines.append("")
    for tag in sorted_tags:
        count = len(by_tag[tag])
        lines.append(f"- **{tag}** ({count})")
    lines.append("")

    # Actionable items section
    actionable = [r for r in results if r.get("actionable")]
    if actionable:
        lines.append("---")
        lines.append(f"## {'需要跟进的想法/行动' if is_zh else 'Actionable Ideas & Todos'}")
        lines.append("")
        for r in actionable:
            lines.append(f"- [ ] **{r['tag']}**: {r['actionable']}")
            lines.append(f"  - {'来源' if is_zh else 'Source'}: `{r['file']}`")
        lines.append("")

    # Detail by tag
    for tag in sorted_tags:
        items = by_tag[tag]
        lines.append("---")
        lines.append(f"## {tag} ({len(items)})")
        lines.append("")

        for r in items:
            lines.append(f"### {r['file']}")
            lines.append("")
            if r.get("summary"):
                lines.append(f"> {r['summary']}")
                lines.append("")
            if r.get("extracted_text"):
                lines.append(f"{'**提取内容：**' if is_zh else '**Extracted text:**'}")
                lines.append("")
                # Indent extracted text as a quote block
                for line in r["extracted_text"].split("\n"):
                    lines.append(f"    {line}")
                lines.append("")
            if r.get("actionable"):
                lines.append(f"{'**行动项：**' if is_zh else '**Action:**'} {r['actionable']}")
                lines.append("")
            has_text = r.get("has_useful_text", True)
            if not has_text:
                lines.append(f"*{'无有用文字内容' if is_zh else 'No useful text content'}*")
                lines.append("")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def extract_screenshots(
    input_folder: str,
    output_folder: str | None = None,
    provider: str = "openai",
    api_key: str | None = None,
    model: str | None = None,
    language: str = "en",
    dry_run: bool = False,
    recursive: bool = False,
) -> list[dict]:
    """
    Main function: extract content from screenshots.

    Original files are NEVER deleted or modified.

    Returns:
        list of extraction results
    """
    is_zh = language == "zh"

    # Resolve API key
    if api_key is None:
        env_var = "OPENAI_API_KEY" if provider == "openai" else "ANTHROPIC_API_KEY"
        api_key = os.environ.get(env_var)
        if not api_key:
            print(f"Error: No API key provided. Set {env_var} or use --api-key.")
            sys.exit(1)

    # System prompt
    system_prompt = SYSTEM_PROMPT_ZH if language == "zh" else SYSTEM_PROMPT_EN

    # Initialize extractor
    if provider == "openai":
        extractor = OpenAIExtractor(api_key=api_key, model=model or "gpt-4o")
    elif provider == "anthropic":
        extractor = AnthropicExtractor(api_key=api_key, model=model or "claude-sonnet-4-20250514")
    else:
        print(f"Error: Unknown provider '{provider}'. Use 'openai' or 'anthropic'.")
        sys.exit(1)

    # Collect images
    images = collect_images(input_folder, recursive=recursive)
    if not images:
        print(f"No images found in {input_folder}")
        return []

    print(f"{'找到' if is_zh else 'Found'} {len(images)} {'张截图' if is_zh else 'screenshots'}.")
    print(f"{'原始文件不会被删除或修改。' if is_zh else 'Originals will NOT be deleted or modified.'}\n")

    if dry_run:
        for img in images:
            print(f"  [DRY RUN] {Path(img).name}")
        print(f"\n{'去掉 --dry-run 开始提取。' if is_zh else 'Remove --dry-run to start extraction.'}")
        return []

    # Output folder
    if output_folder is None:
        output_folder = str(Path(input_folder) / "extracted")
    Path(output_folder).mkdir(parents=True, exist_ok=True)

    results: list[dict] = []

    for img_path in tqdm(images, desc="Extracting" if not is_zh else "提取中", unit="img"):
        filename = Path(img_path).name
        try:
            result = extractor.extract(img_path, system_prompt)
            result["file"] = filename
            result["path"] = img_path
            results.append(result)

            tag = result.get("tag", "?")
            summary = result.get("summary", "")
            has_text = result.get("has_useful_text", False)
            marker = "✓" if has_text else "✗"
            tqdm.write(f"  {marker} [{tag}] {filename}: {summary[:60]}")

        except Exception as e:
            results.append({
                "file": filename,
                "path": img_path,
                "tag": "error",
                "has_useful_text": False,
                "extracted_text": "",
                "summary": f"Error: {e}",
                "actionable": "",
            })
            tqdm.write(f"  ✗ [ERROR] {filename}: {e}")

            # Auth errors - stop early
            if "401" in str(e) or "403" in str(e):
                print(f"\n{'API Key 无效，请检查。' if is_zh else 'Invalid API key. Stopping.'}")
                break

    # Export
    if results:
        # JSON log
        json_path = Path(output_folder) / "extraction_log.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        # Markdown export
        md_path = Path(output_folder) / "extracted_content.md"
        export_markdown(results, str(md_path), language)

        # Print summary
        print("\n" + "=" * 60)
        print(f"{'提取完成！' if is_zh else 'Extraction done!'}")
        print("=" * 60)

        # Stats by tag
        tag_counts: dict[str, int] = {}
        useful_count = 0
        actionable_count = 0
        for r in results:
            tag = r.get("tag", "other")
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
            if r.get("has_useful_text"):
                useful_count += 1
            if r.get("actionable"):
                actionable_count += 1

        print(f"\n  {'标签统计' if is_zh else 'Tags'}:")
        for tag, count in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"    {tag}: {count}")

        print(f"\n  {'总计' if is_zh else 'Total'}: {len(results)} {'张截图' if is_zh else 'screenshots'}")
        print(f"  {'有文字内容' if is_zh else 'With useful text'}: {useful_count}")
        print(f"  {'有行动项/想法' if is_zh else 'Actionable ideas'}: {actionable_count}")
        print(f"  {'无有用内容(可以删)' if is_zh else 'No useful content (safe to delete)'}: {len(results) - useful_count}")

        print(f"\n  {'导出文件' if is_zh else 'Exports'}:")
        print(f"    Markdown: {md_path}")
        print(f"    JSON:     {json_path}")
        print(f"\n  {'原始文件未做任何改动。' if is_zh else 'Original files were NOT modified or deleted.'}")

    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Screenshot Extractor - Extract text & ideas from screenshots using AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Originals are NEVER deleted. This tool only reads and exports.

Examples:
  # Extract content from screenshots
  python screenshot_organizer.py ~/Screenshots

  # Preview which files would be processed
  python screenshot_organizer.py ~/Screenshots --dry-run

  # Use Claude, Chinese output
  python screenshot_organizer.py ~/Screenshots --provider anthropic -l zh

  # Custom output folder
  python screenshot_organizer.py ~/Screenshots -o ~/Extracted

  # Scan subfolders
  python screenshot_organizer.py ~/Screenshots -r
""",
    )

    parser.add_argument(
        "input_folder",
        help="Path to folder containing screenshots",
    )
    parser.add_argument(
        "-o", "--output",
        help="Output folder for exports (default: <input>/extracted)",
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
        help="Model name (default: gpt-4o / claude-sonnet-4-20250514)",
        default=None,
    )
    parser.add_argument(
        "--language", "-l",
        choices=["en", "zh"],
        default="en",
        help="Output language (default: en)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview which files would be processed, no API calls",
    )
    parser.add_argument(
        "--recursive", "-r",
        action="store_true",
        help="Scan subfolders recursively",
    )

    args = parser.parse_args()

    if not Path(args.input_folder).is_dir():
        print(f"Error: '{args.input_folder}' is not a valid directory.")
        sys.exit(1)

    extract_screenshots(
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
