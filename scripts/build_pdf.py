#!/usr/bin/env python3
"""
OERC-S PDF Generator - Python Fallback
=======================================
Agent F (PDF_PACKAGER) - Generates PDF from Markdown using reportlab

This is the fallback PDF generator when pandoc and typst are not available.
It parses markdown and renders it to PDF using reportlab.

Usage:
    python build_pdf.py input.md [output.pdf]
"""

import sys
import re
import os
from pathlib import Path
from typing import List, Tuple, Optional

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.colors import HexColor, black, blue, gray
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Preformatted,
        ListFlowable,
        ListItem,
        PageBreak,
        Table,
        TableStyle,
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
except ImportError:
    print("ERROR: reportlab is not installed.")
    print("Install it with: pip install reportlab>=4.0.0")
    sys.exit(1)


class MarkdownPDFGenerator:
    """Converts Markdown to PDF using reportlab."""

    def __init__(self, pagesize=letter):
        self.pagesize = pagesize
        self.styles = getSampleStyleSheet()
        self._setup_styles()
        self.elements = []
        self.in_code_block = False
        self.code_block_lines = []
        self.code_block_lang = ""

    def _setup_styles(self):
        """Configure custom paragraph styles."""
        # Title style
        self.styles.add(
            ParagraphStyle(
                name="DocTitle",
                parent=self.styles["Title"],
                fontSize=24,
                spaceAfter=30,
                textColor=HexColor("#1a1a2e"),
            )
        )

        # Heading styles
        self.styles.add(
            ParagraphStyle(
                name="Heading1Custom",
                parent=self.styles["Heading1"],
                fontSize=18,
                spaceBefore=20,
                spaceAfter=12,
                textColor=HexColor("#16213e"),
                borderWidth=1,
                borderColor=HexColor("#e94560"),
                borderPadding=5,
            )
        )

        self.styles.add(
            ParagraphStyle(
                name="Heading2Custom",
                parent=self.styles["Heading2"],
                fontSize=14,
                spaceBefore=16,
                spaceAfter=8,
                textColor=HexColor("#0f3460"),
            )
        )

        self.styles.add(
            ParagraphStyle(
                name="Heading3Custom",
                parent=self.styles["Heading3"],
                fontSize=12,
                spaceBefore=12,
                spaceAfter=6,
                textColor=HexColor("#533483"),
            )
        )

        # Body text style
        self.styles.add(
            ParagraphStyle(
                name="BodyCustom",
                parent=self.styles["Normal"],
                fontSize=10,
                leading=14,
                spaceBefore=6,
                spaceAfter=6,
                alignment=TA_JUSTIFY,
            )
        )

        # Code block style (using Courier)
        self.styles.add(
            ParagraphStyle(
                name="CodeBlock",
                parent=self.styles["Code"],
                fontName="Courier",
                fontSize=8,
                leading=10,
                leftIndent=20,
                rightIndent=20,
                spaceBefore=8,
                spaceAfter=8,
                backColor=HexColor("#f5f5f5"),
            )
        )

        # Inline code style
        self.styles.add(
            ParagraphStyle(
                name="InlineCode",
                parent=self.styles["Normal"],
                fontName="Courier",
                fontSize=9,
                backColor=HexColor("#f0f0f0"),
            )
        )

        # Bullet list style
        self.styles.add(
            ParagraphStyle(
                name="BulletItem",
                parent=self.styles["Normal"],
                fontSize=10,
                leading=14,
                leftIndent=20,
                bulletIndent=10,
                spaceBefore=2,
                spaceAfter=2,
            )
        )

    def _process_inline_formatting(self, text: str) -> str:
        """Convert inline markdown formatting to reportlab XML tags."""
        # Escape XML special characters first (except for our tags)
        text = text.replace("&", "&amp;")
        text = text.replace("<", "&lt;")
        text = text.replace(">", "&gt;")

        # Bold: **text** or __text__
        text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
        text = re.sub(r"__(.+?)__", r"<b>\1</b>", text)

        # Italic: *text* or _text_
        text = re.sub(r"\*(.+?)\*", r"<i>\1</i>", text)
        text = re.sub(r"_(.+?)_", r"<i>\1</i>", text)

        # Inline code: `code`
        text = re.sub(
            r"`([^`]+)`",
            r'<font name="Courier" size="9" backColor="#f0f0f0">\1</font>',
            text,
        )

        # Links: [text](url) - just show text with underline
        text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"<u>\1</u>", text)

        return text

    def _parse_heading(self, line: str) -> Optional[Tuple[int, str]]:
        """Parse a heading line and return (level, text)."""
        match = re.match(r"^(#{1,6})\s+(.+)$", line)
        if match:
            level = len(match.group(1))
            text = match.group(2).strip()
            return (level, text)
        return None

    def _parse_bullet(self, line: str) -> Optional[str]:
        """Parse a bullet list item and return the text."""
        match = re.match(r"^\s*[-*+]\s+(.+)$", line)
        if match:
            return match.group(1).strip()
        return None

    def _parse_numbered(self, line: str) -> Optional[str]:
        """Parse a numbered list item and return the text."""
        match = re.match(r"^\s*\d+\.\s+(.+)$", line)
        if match:
            return match.group(1).strip()
        return None

    def _add_heading(self, level: int, text: str):
        """Add a heading to the document."""
        text = self._process_inline_formatting(text)

        if level == 1:
            style = self.styles["Heading1Custom"]
        elif level == 2:
            style = self.styles["Heading2Custom"]
        elif level == 3:
            style = self.styles["Heading3Custom"]
        else:
            style = self.styles["Heading4"]

        self.elements.append(Paragraph(text, style))

    def _add_paragraph(self, text: str):
        """Add a paragraph to the document."""
        text = self._process_inline_formatting(text)
        self.elements.append(Paragraph(text, self.styles["BodyCustom"]))

    def _add_code_block(self, lines: List[str], lang: str = ""):
        """Add a code block to the document."""
        # Join lines and create preformatted text
        code_text = "\n".join(lines)

        # Escape special characters for display
        code_text = code_text.replace("&", "&amp;")
        code_text = code_text.replace("<", "&lt;")
        code_text = code_text.replace(">", "&gt;")

        # Create a preformatted block
        self.elements.append(Spacer(1, 6))

        # Use Preformatted for code blocks to preserve whitespace
        pre = Preformatted(code_text, self.styles["CodeBlock"])
        self.elements.append(pre)

        self.elements.append(Spacer(1, 6))

    def _add_bullet_list(self, items: List[str]):
        """Add a bullet list to the document."""
        list_items = []
        for item in items:
            text = self._process_inline_formatting(item)
            list_items.append(ListItem(Paragraph(text, self.styles["BulletItem"])))

        bullet_list = ListFlowable(
            list_items, bulletType="bullet", leftIndent=20, bulletFontSize=8
        )
        self.elements.append(bullet_list)

    def _add_numbered_list(self, items: List[str]):
        """Add a numbered list to the document."""
        list_items = []
        for item in items:
            text = self._process_inline_formatting(item)
            list_items.append(ListItem(Paragraph(text, self.styles["BulletItem"])))

        numbered_list = ListFlowable(
            list_items, bulletType="1", leftIndent=20, bulletFontSize=10
        )
        self.elements.append(numbered_list)

    def parse_markdown(self, content: str):
        """Parse markdown content and build document elements."""
        lines = content.split("\n")
        i = 0
        bullet_items = []
        numbered_items = []

        while i < len(lines):
            line = lines[i]

            # Handle code blocks (fenced with ```)
            if line.strip().startswith("```"):
                if self.in_code_block:
                    # End of code block
                    self._add_code_block(self.code_block_lines, self.code_block_lang)
                    self.code_block_lines = []
                    self.code_block_lang = ""
                    self.in_code_block = False
                else:
                    # Start of code block
                    # Flush any pending lists
                    if bullet_items:
                        self._add_bullet_list(bullet_items)
                        bullet_items = []
                    if numbered_items:
                        self._add_numbered_list(numbered_items)
                        numbered_items = []

                    self.in_code_block = True
                    # Extract language if specified
                    lang_match = re.match(r"^```(\w+)?", line.strip())
                    if lang_match and lang_match.group(1):
                        self.code_block_lang = lang_match.group(1)
                i += 1
                continue

            if self.in_code_block:
                self.code_block_lines.append(line)
                i += 1
                continue

            # Skip empty lines (but flush lists)
            if not line.strip():
                if bullet_items:
                    self._add_bullet_list(bullet_items)
                    bullet_items = []
                if numbered_items:
                    self._add_numbered_list(numbered_items)
                    numbered_items = []
                i += 1
                continue

            # Check for horizontal rule
            if re.match(r"^[-*_]{3,}\s*$", line.strip()):
                if bullet_items:
                    self._add_bullet_list(bullet_items)
                    bullet_items = []
                if numbered_items:
                    self._add_numbered_list(numbered_items)
                    numbered_items = []
                self.elements.append(Spacer(1, 12))
                i += 1
                continue

            # Check for headings
            heading = self._parse_heading(line)
            if heading:
                if bullet_items:
                    self._add_bullet_list(bullet_items)
                    bullet_items = []
                if numbered_items:
                    self._add_numbered_list(numbered_items)
                    numbered_items = []
                self._add_heading(heading[0], heading[1])
                i += 1
                continue

            # Check for bullet lists
            bullet = self._parse_bullet(line)
            if bullet:
                if numbered_items:
                    self._add_numbered_list(numbered_items)
                    numbered_items = []
                bullet_items.append(bullet)
                i += 1
                continue

            # Check for numbered lists
            numbered = self._parse_numbered(line)
            if numbered:
                if bullet_items:
                    self._add_bullet_list(bullet_items)
                    bullet_items = []
                numbered_items.append(numbered)
                i += 1
                continue

            # Regular paragraph
            if bullet_items:
                self._add_bullet_list(bullet_items)
                bullet_items = []
            if numbered_items:
                self._add_numbered_list(numbered_items)
                numbered_items = []

            # Collect multi-line paragraphs
            para_lines = [line.strip()]
            while (
                i + 1 < len(lines)
                and lines[i + 1].strip()
                and not lines[i + 1].strip().startswith("#")
                and not lines[i + 1].strip().startswith("```")
                and not self._parse_bullet(lines[i + 1])
                and not self._parse_numbered(lines[i + 1])
                and not re.match(r"^[-*_]{3,}\s*$", lines[i + 1].strip())
            ):
                i += 1
                para_lines.append(lines[i].strip())

            self._add_paragraph(" ".join(para_lines))
            i += 1

        # Flush any remaining lists
        if bullet_items:
            self._add_bullet_list(bullet_items)
        if numbered_items:
            self._add_numbered_list(numbered_items)

    def generate_pdf(self, input_path: str, output_path: str):
        """Generate PDF from markdown file."""
        # Read input file
        input_file = Path(input_path)
        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")

        content = input_file.read_text(encoding="utf-8")

        # Extract title from first H1 if present
        title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        doc_title = title_match.group(1) if title_match else "OERC-S Specification"

        # Create document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=self.pagesize,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
            title=doc_title,
            author="OERC Working Group",
        )

        # Add title
        self.elements.append(Paragraph(doc_title, self.styles["DocTitle"]))
        self.elements.append(Spacer(1, 20))

        # Parse and add content
        self.parse_markdown(content)

        # Build PDF
        doc.build(self.elements)
        print(f"[SUCCESS] PDF generated: {output_path}")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python build_pdf.py <input.md> [output.pdf]")
        print()
        print("Arguments:")
        print("  input.md   - Path to input markdown file")
        print("  output.pdf - Path to output PDF (default: same as input with .pdf)")
        sys.exit(1)

    input_path = sys.argv[1]

    # Determine output path
    if len(sys.argv) >= 3:
        output_path = sys.argv[2]
    else:
        # Default: same directory, same name, .pdf extension
        input_file = Path(input_path)
        output_path = str(input_file.with_suffix(".pdf"))

    print(f"[INFO] Input: {input_path}")
    print(f"[INFO] Output: {output_path}")

    try:
        generator = MarkdownPDFGenerator(pagesize=letter)
        generator.generate_pdf(input_path, output_path)
    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Failed to generate PDF: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
