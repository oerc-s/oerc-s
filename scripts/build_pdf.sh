#!/usr/bin/env bash
# =============================================================================
# OERC-S PDF Build Script
# =============================================================================
# Agent F (PDF_PACKAGER) - PDF generation with multiple fallback strategies
#
# Priority order:
#   1. pandoc with xelatex/pdflatex
#   2. typst
#   3. Python reportlab fallback
# =============================================================================

set -e

# Determine script directory (works on Unix and Git Bash on Windows)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SPEC_DIR="$REPO_ROOT/spec"

# Default input/output
INPUT_MD="${1:-$SPEC_DIR/OERC-S_v0.1.md}"
OUTPUT_PDF="${2:-${INPUT_MD%.md}.pdf}"

# Colors for output (if terminal supports it)
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if input file exists
if [[ ! -f "$INPUT_MD" ]]; then
    log_error "Input file not found: $INPUT_MD"
    exit 1
fi

log_info "Building PDF from: $INPUT_MD"
log_info "Output target: $OUTPUT_PDF"

# =============================================================================
# Strategy 1: pandoc with LaTeX
# =============================================================================
try_pandoc() {
    if ! command -v pandoc &> /dev/null; then
        log_warn "pandoc not found"
        return 1
    fi

    log_info "Found pandoc, checking for LaTeX engine..."

    # Try xelatex first (better Unicode support)
    if command -v xelatex &> /dev/null; then
        log_info "Using pandoc with xelatex engine"
        pandoc "$INPUT_MD" -o "$OUTPUT_PDF" \
            --pdf-engine=xelatex \
            -V geometry:margin=1in \
            -V fontsize=11pt \
            --highlight-style=tango \
            --toc \
            --toc-depth=3 \
            -V colorlinks=true \
            -V linkcolor=blue \
            -V urlcolor=blue
        return 0
    fi

    # Fallback to pdflatex
    if command -v pdflatex &> /dev/null; then
        log_info "Using pandoc with pdflatex engine"
        pandoc "$INPUT_MD" -o "$OUTPUT_PDF" \
            --pdf-engine=pdflatex \
            -V geometry:margin=1in \
            -V fontsize=11pt \
            --highlight-style=tango \
            --toc \
            --toc-depth=3 \
            -V colorlinks=true \
            -V linkcolor=blue \
            -V urlcolor=blue
        return 0
    fi

    log_warn "pandoc found but no LaTeX engine available (xelatex or pdflatex)"
    return 1
}

# =============================================================================
# Strategy 2: typst
# =============================================================================
try_typst() {
    if ! command -v typst &> /dev/null; then
        log_warn "typst not found"
        return 1
    fi

    log_info "Found typst, converting markdown to typst format..."

    # Create temporary typst file
    TEMP_TYPST=$(mktemp --suffix=.typ 2>/dev/null || mktemp -t oerc_spec.typ)

    # Convert markdown to typst format
    # This is a basic conversion - typst has native markdown support via pandoc
    if command -v pandoc &> /dev/null; then
        log_info "Using pandoc to convert to typst"
        pandoc "$INPUT_MD" -o "$TEMP_TYPST" -t typst
    else
        # Manual conversion fallback
        log_info "Manual markdown to typst conversion"
        cat > "$TEMP_TYPST" << 'TYPST_HEADER'
#set document(title: "OERC-S Specification", author: "OERC Working Group")
#set page(margin: 1in, numbering: "1")
#set text(font: "Linux Libertine", size: 11pt)
#set heading(numbering: "1.1")
#show raw: set text(font: "Fira Code", size: 9pt)
#show raw.where(block: true): block.with(fill: luma(240), inset: 8pt, radius: 4pt)

TYPST_HEADER

        # Basic markdown to typst conversion
        sed -e 's/^# \(.*\)$/= \1/' \
            -e 's/^## \(.*\)$/== \1/' \
            -e 's/^### \(.*\)$/=== \1/' \
            -e 's/^#### \(.*\)$/==== \1/' \
            -e 's/^- /- /' \
            -e 's/\*\*\([^*]*\)\*\*/*\1*/g' \
            -e 's/`\([^`]*\)`/`\1`/g' \
            "$INPUT_MD" >> "$TEMP_TYPST"
    fi

    # Build PDF with typst
    typst compile "$TEMP_TYPST" "$OUTPUT_PDF"

    # Cleanup
    rm -f "$TEMP_TYPST"
    return 0
}

# =============================================================================
# Strategy 3: Python with reportlab
# =============================================================================
try_python() {
    log_info "Falling back to Python reportlab..."

    # Check for Python
    PYTHON_CMD=""
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        log_error "Python not found"
        return 1
    fi

    log_info "Using $PYTHON_CMD"

    # Check if reportlab is available
    if ! $PYTHON_CMD -c "import reportlab" 2>/dev/null; then
        log_warn "reportlab not installed, attempting to install..."
        $PYTHON_CMD -m pip install reportlab>=4.0.0 || {
            log_error "Failed to install reportlab"
            return 1
        }
    fi

    # Run the Python PDF generator
    $PYTHON_CMD "$SCRIPT_DIR/build_pdf.py" "$INPUT_MD" "$OUTPUT_PDF"
    return 0
}

# =============================================================================
# Main execution
# =============================================================================
main() {
    log_info "OERC-S PDF Build System"
    log_info "======================="

    # Try strategies in order
    if try_pandoc; then
        log_success "PDF generated successfully with pandoc"
    elif try_typst; then
        log_success "PDF generated successfully with typst"
    elif try_python; then
        log_success "PDF generated successfully with Python reportlab"
    else
        log_error "All PDF generation strategies failed"
        log_error "Please install one of: pandoc+latex, typst, or python+reportlab"
        exit 1
    fi

    # Verify output
    if [[ -f "$OUTPUT_PDF" ]]; then
        FILE_SIZE=$(stat -c%s "$OUTPUT_PDF" 2>/dev/null || stat -f%z "$OUTPUT_PDF" 2>/dev/null || echo "unknown")
        log_success "Output: $OUTPUT_PDF ($FILE_SIZE bytes)"
    else
        log_error "PDF file was not created"
        exit 1
    fi
}

main "$@"
