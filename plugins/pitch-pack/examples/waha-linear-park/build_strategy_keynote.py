#!/usr/bin/env python3
"""
Waha Strategy Approach — PPTX / Keynote generator
Mirrors the Onsor Mosha design tokens from the HTML hub.

Output: "Waha - Strategy Approach.pptx" — 1920×1080, native editable.

Open in Keynote: File → Open → select .pptx (Keynote converts on the fly)
or File → Export To → Keynote for a .key file.

────────────────────────────────────────────────────────────
TOKENS
────────────────────────────────────────────────────────────
Surface:    OM Gray   #DBE2E0
            OM Black  #000000
Accent:     OM Green  #00FF00  (numbers + inline highlight runs)
Type:       Family "OM" (Light + Medium via bold flag)

Padding:    6.5 cqi horizontal   /   4.56 cqi vertical
            (cqi = % of slide width 1920 px)

Headline:   4.4 cqi   (≈63 pt)
Body:       1.3 cqi   (≈19 pt)

Hairlines on covers:    15.4 / 33.2 / 75 %  of slide height
Hairlines on dividers:  15.4 / 66.5 %       of slide height
"""

from pptx import Presentation
from pptx.util import Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_CONNECTOR
from pptx.oxml.ns import qn
from lxml import etree
from pathlib import Path

# ════════════════════════════════════════════════════════════
# TOKENS
# ════════════════════════════════════════════════════════════

SLIDE_W = 1920
SLIDE_H = 1080

OM_GRAY  = RGBColor(0xDB, 0xE2, 0xE0)
OM_BLACK = RGBColor(0x00, 0x00, 0x00)
OM_GREEN = RGBColor(0x00, 0xFF, 0x00)
OM_WHITE = RGBColor(0xFF, 0xFF, 0xFF)

OM_GREEN_HEX = '00FF00'

FONT = 'OM'

def cqi(n):
    """cqi unit → px (relative to slide width 1920)."""
    return n / 100 * SLIDE_W

def cqi_pt(n):
    """cqi → pt (96 dpi convention: 1 px = 0.75 pt)."""
    return cqi(n) * 0.75

# Layout
PAD_X = cqi(6.5)         # 124.8 px
PAD_Y = cqi(4.56)        # 87.55 px
INNER_W = SLIDE_W - 2 * PAD_X

# Font sizes (pt)
FS_COVER       = 100                       # cover title
FS_NUMBER      = 180                       # giant green section number
FS_TITLE       = round(cqi_pt(4.4))        # ≈63 pt — section title / headline
FS_STATEMENT   = 56                        # large statement
FS_STATEMENT_T = 70                        # tall statement
FS_HEAD_4      = 32                        # card heading
FS_LEAD        = 22                        # lead text
FS_BODY        = round(cqi_pt(1.3))        # ≈19 pt — body
FS_DECK        = 18                        # opener deck
FS_BENCH       = 16                        # bench prose
FS_KICKER      = 11                        # uppercase labels
FS_META        = 11                        # top/bottom meta

# Hairline positions (% of slide height)
HL_COVER_TOP = SLIDE_H * 0.154       # 166.32
HL_COVER_MID = SLIDE_H * 0.332       # 358.56
HL_COVER_BOT = SLIDE_H * 0.75        # 810
HL_DIV_TOP   = SLIDE_H * 0.154       # 166.32
HL_DIV_BOT   = SLIDE_H * 0.665       # 717.9

HAIRLINE_W = 2  # pt

# Letter spacing for kickers (hundredths of pt in OOXML 'spc' attribute)
SPC_KICKER = 200

# ════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════

def px_emu(n):
    return int(round(n * 9525))

def add_slide(prs, fill):
    s = prs.slides.add_slide(prs.slide_layouts[6])  # blank
    bg = s.background.fill
    bg.solid()
    bg.fore_color.rgb = fill
    return s

def add_hairline(slide, y, color, full=True, weight=HAIRLINE_W):
    x1 = 0 if full else PAD_X
    x2 = SLIDE_W if full else SLIDE_W - PAD_X
    ln = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT,
                                    px_emu(x1), px_emu(y),
                                    px_emu(x2), px_emu(y))
    ln.line.color.rgb = color
    ln.line.width = Pt(weight)
    return ln

def add_vline(slide, x, y1, y2, color, weight=1):
    ln = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT,
                                    px_emu(x), px_emu(y1),
                                    px_emu(x), px_emu(y2))
    ln.line.color.rgb = color
    ln.line.width = Pt(weight)
    return ln

def _new_textbox(slide, x, y, w, h, anchor='top'):
    tb = slide.shapes.add_textbox(px_emu(x), px_emu(y), px_emu(w), px_emu(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = 0; tf.margin_right = 0
    tf.margin_top = 0;  tf.margin_bottom = 0
    if anchor == 'top':
        tf.vertical_anchor = MSO_ANCHOR.TOP
    elif anchor == 'middle':
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    elif anchor == 'bottom':
        tf.vertical_anchor = MSO_ANCHOR.BOTTOM
    return tf

def _style_run(run, size, color, bold=False, letter_spacing=None):
    run.font.name = FONT
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    if letter_spacing is not None:
        rPr = run._r.get_or_add_rPr()
        rPr.set('spc', str(letter_spacing))

def set_highlight(run, hex_color=OM_GREEN_HEX):
    """Add OOXML <a:highlight> to a run (inline text highlight)."""
    rPr = run._r.get_or_add_rPr()
    highlight = etree.SubElement(rPr, qn('a:highlight'))
    srgb = etree.SubElement(highlight, qn('a:srgbClr'))
    srgb.set('val', hex_color)

def text(slide, content, x, y, w, h, size, color,
         bold=False, anchor='top', align='left',
         line_spacing=None, letter_spacing=None, uppercase=False):
    tf = _new_textbox(slide, x, y, w, h, anchor)
    p = tf.paragraphs[0]
    p.alignment = {'left': PP_ALIGN.LEFT,
                   'center': PP_ALIGN.CENTER,
                   'right': PP_ALIGN.RIGHT}[align]
    if line_spacing is not None:
        p.line_spacing = line_spacing
    run = p.add_run()
    run.text = content.upper() if uppercase else content
    _style_run(run, size, color, bold, letter_spacing)
    return tf

def rt(text_str, highlight=False, bold=False, color=None):
    """Build a rich text segment."""
    return {'text': text_str, 'highlight': highlight, 'bold': bold, 'color': color}

def rich_text(slide, segments, x, y, w, h, size, color,
              bold=False, anchor='top', align='left',
              line_spacing=None, letter_spacing=None):
    tf = _new_textbox(slide, x, y, w, h, anchor)
    p = tf.paragraphs[0]
    p.alignment = {'left': PP_ALIGN.LEFT,
                   'center': PP_ALIGN.CENTER,
                   'right': PP_ALIGN.RIGHT}[align]
    if line_spacing is not None:
        p.line_spacing = line_spacing
    for seg in segments:
        run = p.add_run()
        run.text = seg['text']
        if seg.get('highlight'):
            _style_run(run, size, OM_BLACK, bold=True, letter_spacing=letter_spacing)
            set_highlight(run)
        else:
            _style_run(run, size, seg.get('color') or color,
                       bold=seg.get('bold') or bold,
                       letter_spacing=letter_spacing)
    return tf

# ════════════════════════════════════════════════════════════
# SLIDE TEMPLATES
# ════════════════════════════════════════════════════════════

def slide_cover(prs):
    s = add_slide(prs, OM_GRAY)
    add_hairline(s, HL_COVER_TOP, OM_BLACK)
    add_hairline(s, HL_COVER_BOT, OM_BLACK)

    # Top meta band (above HL_COVER_TOP)
    text(s, "ONSOR MOSHA × NEW MURABBA DEVELOPMENT COMPANY",
         PAD_X, HL_COVER_TOP - 50, INNER_W * 0.6, 30,
         FS_META, OM_BLACK, anchor='top', letter_spacing=SPC_KICKER, uppercase=False)
    text(s, "STRATEGY APPROACH    /    LINEAR PARK · WAHA",
         PAD_X + INNER_W * 0.6, HL_COVER_TOP - 50, INNER_W * 0.4, 30,
         FS_META, OM_BLACK, anchor='top', align='right', letter_spacing=SPC_KICKER)

    # Cover title — between top and bottom hairlines
    rich_text(s, [
        rt("Strategy "),
        rt("Approach.", highlight=True),
    ], PAD_X, HL_COVER_TOP + 100, INNER_W, 520,
        FS_COVER, OM_BLACK, bold=True, line_spacing=0.96)

    # Strapline — below bottom hairline
    text(s,
         "The strategy work that sits underneath the creative. It covers what is happening, "
         "who the work is really for, what the work has to do, and the frame the creative "
         "platform will rest on. The point of this section is to leave everyone in the room "
         "standing on the same ground before the creative comes out.",
         PAD_X, HL_COVER_BOT + 35, INNER_W * 0.7, 200,
         FS_LEAD, OM_BLACK, line_spacing=1.45)
    return s


def slide_divider(prs, num_str, kicker_left, kicker_right, title_segments, deck,
                  dark=False, full_hairlines=True):
    fill = OM_BLACK if dark else OM_GRAY
    color = OM_WHITE if dark else OM_BLACK
    s = add_slide(prs, fill)
    add_hairline(s, HL_DIV_TOP, color)
    add_hairline(s, HL_DIV_BOT, color)

    # Label band
    text(s, kicker_left,
         PAD_X, HL_DIV_TOP - 50, INNER_W * 0.5, 30,
         FS_KICKER, color, anchor='top', letter_spacing=SPC_KICKER)
    text(s, kicker_right,
         PAD_X + INNER_W * 0.5, HL_DIV_TOP - 50, INNER_W * 0.5, 30,
         FS_KICKER, color, anchor='top', align='right', letter_spacing=SPC_KICKER)

    # Giant green section number — left column, between hairlines
    text(s, num_str,
         PAD_X, HL_DIV_TOP + 40, INNER_W * 0.22, 480,
         FS_NUMBER, OM_GREEN, bold=False, anchor='top', line_spacing=0.88)

    # Title — right column, between hairlines
    rich_text(s, title_segments,
              PAD_X + INNER_W * 0.24, HL_DIV_TOP + 90, INNER_W * 0.76, 480,
              FS_TITLE, color, bold=True, line_spacing=1.02)

    # Deck — below bottom hairline
    text(s, deck,
         PAD_X + INNER_W * 0.24, HL_DIV_BOT + 35, INNER_W * 0.65, 280,
         FS_DECK, color, line_spacing=1.5)

    return s


def slide_label_band(slide, left, right, color):
    """Top hairline + kicker labels on a content slide."""
    add_hairline(slide, HL_DIV_TOP, color)
    text(slide, left,
         PAD_X, HL_DIV_TOP - 50, INNER_W * 0.5, 30,
         FS_KICKER, color, anchor='top', letter_spacing=SPC_KICKER)
    text(slide, right,
         PAD_X + INNER_W * 0.5, HL_DIV_TOP - 50, INNER_W * 0.5, 30,
         FS_KICKER, color, anchor='top', align='right', letter_spacing=SPC_KICKER)


def slide_statement(prs, kicker_left, kicker_right, statement_segments, sub=None,
                    dark=False, size=FS_STATEMENT):
    fill = OM_BLACK if dark else OM_GRAY
    color = OM_WHITE if dark else OM_BLACK
    s = add_slide(prs, fill)
    slide_label_band(s, kicker_left, kicker_right, color)

    rich_text(s, statement_segments,
              PAD_X, HL_DIV_TOP + 90, INNER_W * 0.86, 600,
              size, color, bold=True, line_spacing=1.08)

    if sub:
        text(s, sub,
             PAD_X, HL_DIV_TOP + 90 + 480, INNER_W * 0.7, 200,
             FS_BODY, color, line_spacing=1.55)
    return s


def slide_two_cards(prs, kicker_left, kicker_right, cards, dark=False):
    """
    cards: list of two dicts with keys: n (kicker), h (heading), p (paragraph)
    """
    fill = OM_BLACK if dark else OM_GRAY
    color = OM_WHITE if dark else OM_BLACK
    s = add_slide(prs, fill)
    slide_label_band(s, kicker_left, kicker_right, color)

    # Top + bottom rules for the card row
    y_top = HL_DIV_TOP + 100
    y_bot = HL_DIV_TOP + 100 + 580
    add_hairline(s, y_top, color, full=False)
    add_hairline(s, y_bot, color, full=False)

    col_w = INNER_W / 2
    # Vertical separator between cards
    add_vline(s, PAD_X + col_w, y_top + 10, y_bot - 10, color, weight=1)

    for i, c in enumerate(cards):
        x0 = PAD_X + i * col_w + (40 if i == 1 else 0)
        w  = col_w - 40

        # Kicker n
        text(s, c['n'].upper(),
             x0, y_top + 36, w, 28,
             FS_KICKER, color, letter_spacing=SPC_KICKER)

        # Heading
        text(s, c['h'],
             x0, y_top + 86, w, 200,
             FS_HEAD_4, color, bold=True, line_spacing=1.1)

        # Paragraph
        text(s, c['p'],
             x0, y_top + 320, w, 240,
             FS_BODY, color, line_spacing=1.55)

    return s


def slide_single_panel(prs, kicker_left, kicker_right, label, heading, paragraphs, dark=False):
    """A single full-width card with a label, heading, body paragraphs."""
    fill = OM_BLACK if dark else OM_GRAY
    color = OM_WHITE if dark else OM_BLACK
    s = add_slide(prs, fill)
    slide_label_band(s, kicker_left, kicker_right, color)

    y_top = HL_DIV_TOP + 120
    y_bot = HL_DIV_TOP + 120 + 660
    add_hairline(s, y_top, color, full=False)
    add_hairline(s, y_bot, color, full=False)

    # Label (left column)
    text(s, label,
         PAD_X, y_top + 50, INNER_W * 0.22, 60,
         FS_KICKER, color, letter_spacing=SPC_KICKER)

    # Heading (right column, top half)
    text(s, heading,
         PAD_X + INNER_W * 0.24, y_top + 40, INNER_W * 0.74, 240,
         round(FS_TITLE * 0.7), color, bold=True, line_spacing=1.08)

    # Paragraphs
    y_p = y_top + 280
    for para in paragraphs:
        text(s, para,
             PAD_X + INNER_W * 0.24, y_p, INNER_W * 0.66, 200,
             FS_LEAD, color, line_spacing=1.55)
        y_p += 120

    return s


def slide_ring(prs, kicker_left, kicker_right, role, who, who_desc, need_label, need_p, dark=False):
    fill = OM_BLACK if dark else OM_GRAY
    color = OM_WHITE if dark else OM_BLACK
    s = add_slide(prs, fill)
    slide_label_band(s, kicker_left, kicker_right, color)

    y_top = HL_DIV_TOP + 120
    y_bot = HL_DIV_TOP + 120 + 660
    add_hairline(s, y_top, color, full=False)
    add_hairline(s, y_bot, color, full=False)

    # Role label
    text(s, role.upper(),
         PAD_X, y_top + 50, INNER_W * 0.16, 60,
         FS_KICKER, color, letter_spacing=SPC_KICKER)

    # Who
    text(s, who,
         PAD_X + INNER_W * 0.18, y_top + 40, INNER_W * 0.42, 180,
         FS_HEAD_4, color, bold=True, line_spacing=1.1)

    # Who description
    text(s, who_desc,
         PAD_X + INNER_W * 0.18, y_top + 220, INNER_W * 0.42, 360,
         FS_BODY, color, line_spacing=1.55)

    # Vertical separator
    add_vline(s, PAD_X + INNER_W * 0.63, y_top + 20, y_bot - 20, color, weight=1)

    # Need label
    text(s, need_label.upper(),
         PAD_X + INNER_W * 0.66, y_top + 50, INNER_W * 0.32, 60,
         FS_KICKER, color, letter_spacing=SPC_KICKER)
    # Need paragraph
    text(s, need_p,
         PAD_X + INNER_W * 0.66, y_top + 120, INNER_W * 0.32, 400,
         FS_LEAD, color, line_spacing=1.55)

    return s


def slide_arc(prs, kicker_left, kicker_right, stages, dark=False):
    """6-stage arc, one column per stage."""
    fill = OM_BLACK if dark else OM_GRAY
    color = OM_WHITE if dark else OM_BLACK
    accent = OM_GREEN if dark else OM_BLACK
    s = add_slide(prs, fill)
    slide_label_band(s, kicker_left, kicker_right, color)

    # Headline
    text(s, "From a park you visit to a park where you belong.",
         PAD_X, HL_DIV_TOP + 70, INNER_W * 0.6, 200,
         44, color, bold=True, line_spacing=1.1)

    # Subtitle
    text(s,
         "Six stages, six emotional notes, one journey. The platform should have "
         "something to say at every stage.",
         PAD_X, HL_DIV_TOP + 220, INNER_W * 0.55, 120,
         FS_BODY, color, line_spacing=1.55)

    # Arc area
    y_top = HL_DIV_TOP + 380
    y_bot = HL_DIV_TOP + 380 + 280
    add_hairline(s, y_top, color, full=False)
    add_hairline(s, y_bot, color, full=False, weight=1)

    col_w = INNER_W / 6
    for i, st in enumerate(stages):
        x = PAD_X + i * col_w
        # Vertical separator
        if i > 0:
            add_vline(s, x, y_top + 10, y_bot - 10, color, weight=1)
        # Stage label
        text(s, f"STAGE 0{i+1}",
             x + 16, y_top + 30, col_w - 32, 24,
             FS_KICKER, accent, letter_spacing=SPC_KICKER)
        # Stage name
        text(s, st['name'],
             x + 16, y_top + 70, col_w - 32, 60,
             22, color, bold=True, line_spacing=1.05)
        # Meta
        text(s, f"Emotion: {st['emotion']}\nEnergy: {st['energy']}",
             x + 16, y_top + 140, col_w - 32, 100,
             13, color, line_spacing=1.55)
    return s


def slide_two_col_reading(prs, kicker_left, kicker_right, left_kicker, left_body,
                          right_kicker, right_body, dark=False):
    fill = OM_BLACK if dark else OM_GRAY
    color = OM_WHITE if dark else OM_BLACK
    s = add_slide(prs, fill)
    slide_label_band(s, kicker_left, kicker_right, color)

    # Title for the slide
    text(s, "How to read the arc.",
         PAD_X, HL_DIV_TOP + 70, INNER_W * 0.5, 100,
         44, color, bold=True, line_spacing=1.1)

    y_top = HL_DIV_TOP + 240
    add_hairline(s, y_top, color, full=False)

    col_w = INNER_W / 2 - 30
    # Left col
    text(s, left_kicker.upper(),
         PAD_X, y_top + 32, col_w, 30,
         FS_KICKER, color, letter_spacing=SPC_KICKER)
    text(s, left_body,
         PAD_X, y_top + 78, col_w, 480,
         FS_LEAD, color, line_spacing=1.6)
    # Right col
    text(s, right_kicker.upper(),
         PAD_X + col_w + 60, y_top + 32, col_w, 30,
         FS_KICKER, color, letter_spacing=SPC_KICKER)
    text(s, right_body,
         PAD_X + col_w + 60, y_top + 78, col_w, 480,
         FS_LEAD, color, line_spacing=1.6)

    return s


def slide_bench(prs, kicker_left, kicker_right, name, city, positioning, takeaway, dark=False):
    fill = OM_BLACK if dark else OM_GRAY
    color = OM_WHITE if dark else OM_BLACK
    s = add_slide(prs, fill)
    slide_label_band(s, kicker_left, kicker_right, color)

    y_top = HL_DIV_TOP + 120
    y_bot = HL_DIV_TOP + 120 + 660
    add_hairline(s, y_top, color, full=False)
    add_hairline(s, y_bot, color, full=False)

    col_w = INNER_W / 3 - 30
    # Col 1 — name + city
    text(s, name,
         PAD_X, y_top + 60, col_w, 100,
         44, color, bold=True, line_spacing=1.05)
    text(s, city.upper(),
         PAD_X, y_top + 180, col_w, 30,
         FS_KICKER, color, letter_spacing=SPC_KICKER)

    # Col 2 — positioning
    text(s, "HOW THEY POSITIONED IT",
         PAD_X + col_w + 45, y_top + 60, col_w, 30,
         FS_KICKER, color, letter_spacing=SPC_KICKER)
    text(s, positioning,
         PAD_X + col_w + 45, y_top + 105, col_w, 500,
         FS_BENCH, color, line_spacing=1.6)

    # Col 3 — takeaway
    text(s, "WHAT WE TAKE FROM IT",
         PAD_X + (col_w + 45) * 2, y_top + 60, col_w, 30,
         FS_KICKER, color, letter_spacing=SPC_KICKER)
    text(s, takeaway,
         PAD_X + (col_w + 45) * 2, y_top + 105, col_w, 500,
         FS_BENCH, color, line_spacing=1.6)

    return s


def slide_objectives(prs, kicker_left, kicker_right, objectives, dark=False):
    fill = OM_BLACK if dark else OM_GRAY
    color = OM_WHITE if dark else OM_BLACK
    s = add_slide(prs, fill)
    slide_label_band(s, kicker_left, kicker_right, color)
    accent = OM_GREEN if dark else OM_BLACK

    y_top = HL_DIV_TOP + 110
    row_h = 160
    add_hairline(s, y_top, color, full=False)
    for i, o in enumerate(objectives):
        y = y_top + (i + 1) * row_h
        add_hairline(s, y, color, full=False, weight=1 if i < len(objectives) - 1 else 2)
        y_row = y_top + i * row_h
        # Num
        text(s, f"0{i+1}",
             PAD_X, y_row + 25, INNER_W * 0.1, 120,
             56, accent, line_spacing=1.0)
        # What
        text(s, o['what'],
             PAD_X + INNER_W * 0.12, y_row + 40, INNER_W * 0.55, 120,
             26, color, bold=True, line_spacing=1.15)
        # Read by (label + measure)
        text(s, "READ BY",
             PAD_X + INNER_W * 0.7, y_row + 38, INNER_W * 0.3, 24,
             10, color, letter_spacing=SPC_KICKER)
        text(s, o['measure'],
             PAD_X + INNER_W * 0.7, y_row + 70, INNER_W * 0.3, 100,
             FS_BODY, color, line_spacing=1.5)
    return s


def slide_filters(prs, kicker_left, kicker_right, dark=False):
    fill = OM_BLACK if dark else OM_GRAY
    color = OM_WHITE if dark else OM_BLACK
    accent = OM_GREEN if dark else OM_BLACK
    s = add_slide(prs, fill)
    slide_label_band(s, kicker_left, kicker_right, color)

    # Headline
    text(s, "Three filters for everything that follows.",
         PAD_X, HL_DIV_TOP + 70, INNER_W * 0.7, 150,
         44, color, bold=True, line_spacing=1.1)

    y_top = HL_DIV_TOP + 280
    y_bot = HL_DIV_TOP + 280 + 520
    add_hairline(s, y_top, color, full=False)
    add_hairline(s, y_bot, color, full=False)

    col_w = INNER_W / 3
    filters = [
        ("FILTER 01", "Does it scale?",
         "Across all three audience rings. Across the day and the night. Across the six emotional stages of the visit. And into the chapters that arrive after the park. Strategy here is mostly about portability."),
        ("FILTER 02", "Is it Riyadh?",
         "Specific, contemporary, and clearly Saudi from the first frame. Not a generic park campaign with a Riyadh label dropped onto it. The cultural texture has to be in the work itself."),
        ("FILTER 03", "Does it set up what comes next?",
         "A platform that closes neatly on the park is the wrong one. The right one leaves a door open to the Experience Center and the rest of the masterplan still to come."),
    ]
    for i, (n, h, p) in enumerate(filters):
        x = PAD_X + i * col_w
        if i > 0:
            add_vline(s, x, y_top + 20, y_bot - 20, color, weight=1)
        text(s, n, x + 30, y_top + 40, col_w - 60, 30,
             FS_KICKER, accent, letter_spacing=SPC_KICKER)
        text(s, h, x + 30, y_top + 90, col_w - 60, 130,
             24, color, bold=True, line_spacing=1.1)
        text(s, p, x + 30, y_top + 220, col_w - 60, 280,
             FS_BODY, color, line_spacing=1.6)
    return s


# ════════════════════════════════════════════════════════════
# BUILD THE DECK
# ════════════════════════════════════════════════════════════

def build():
    prs = Presentation()
    prs.slide_width  = Emu(px_emu(SLIDE_W))
    prs.slide_height = Emu(px_emu(SLIDE_H))

    # ─── COVER ──────────────────────────────────────────
    slide_cover(prs)

    # ─── 01 · THE MOMENT ────────────────────────────────
    slide_divider(prs, "01",
        "01 · WHERE WE STAND", "THE MOMENT",
        [rt("The first "), rt("living chapter", highlight=True), rt(" of New Murabba.")],
        "The Linear Park is not the headline of the masterplan, but it is the first piece "
        "of it that opens. It is the first piece anyone can walk into, photograph, and form "
        "an opinion about. Even though it is a small slice of a much larger project, it has "
        "to behave like a finished destination on day one.",
        dark=False)

    slide_statement(prs,
        "THE SCALE OF THE MOMENT", "01 · MOMENT",
        [rt("A "), rt("48.5K sqm", highlight=True),
         rt(" park, opening as roughly the first 3% of a 19km park system, and carrying the weight of the entire downtown story.")],
        size=FS_STATEMENT)

    slide_two_cards(prs,
        "WHAT IS ACTUALLY OPENING", "THE ASSET",
        [
            {"n": "01 · The Park",
             "h": "A complete public realm, not a phase-one preview.",
             "p": "800 trees, 25% green coverage, a 5,000-seat amphitheater, food and beverage, kids' spaces, courts, and gathering plazas. It is the most complete piece of public space the masterplan has put on the ground so far."},
            {"n": "02 · The Setting",
             "h": "The window before everything else lands.",
             "p": "The Mukaab is still being built and the Experience Center has not opened yet, so the park is the first thing anyone will visit, photograph, and talk about. Whatever the park feels like is what New Murabba will feel like for a long time."},
        ])

    slide_two_cards(prs,
        "WHY IT MATTERS", "THE PRESSURE",
        [
            {"n": "03 · Two jobs at once",
             "h": "Proof of Progress and Experience Demonstrator.",
             "p": "The park has to prove that the downtown is real and being built, and at the same time act as a working preview of how the rest of it will feel when it opens. Both jobs sit on the same site."},
            {"n": "04 · Four audiences watching",
             "h": "One platform that lands for all of them.",
             "p": "Investors, partners, neighbors, and visitors are all watching at the same time. The work has to land for each of them without turning into four different campaigns. The aim is one platform that each audience can read in their own way."},
        ])

    # ─── 02 · STRATEGIC PROBLEM ─────────────────────────
    slide_divider(prs, "02",
        "02 · WHAT WE ARE ACTUALLY SOLVING", "THE STRATEGIC PROBLEM",
        [rt("A small piece, doing "), rt("a very big job.", highlight=True)],
        "Most park launches are about the park. This one is about using the park to "
        "communicate the future of a downtown, which is a different brief. Three problems "
        "sit underneath that. The platform has to handle all three at the same time.",
        dark=True)

    slide_single_panel(prs,
        "PROBLEM 01", "02 · STRATEGIC PROBLEM", "PROBLEM 01",
        "The opening has to feel finished, not partial.",
        ["Visitors do not give credit for “phase one of a larger plan.” They give credit "
         "for a place that feels alive, looked after, and worth the trip out. The opening "
         "has to read as the destination it is going to be, even though the rest of the "
         "park system is years away from being built."],
        dark=True)

    slide_single_panel(prs,
        "PROBLEM 02", "02 · STRATEGIC PROBLEM", "PROBLEM 02",
        "The same place has to feel right in the day and at night.",
        ["Investors and B2B tours come during the day. Families, wanderers, and event-goers "
         "come at night. The platform has to feel calm and confident in the daytime and "
         "lively and lived-in after dark, without becoming two separate identities."],
        dark=True)

    slide_single_panel(prs,
        "PROBLEM 03", "02 · STRATEGIC PROBLEM", "PROBLEM 03",
        "Whatever lands here will set the tone for everything after.",
        ["The platform built for this launch will shape how the Experience Center is "
         "introduced, how the rest of the linear park is rolled out, and how the Mukaab is "
         "eventually revealed. So an idea that only works for the opening is not enough. "
         "It has to keep working as the next chapters of New Murabba arrive."],
        dark=True)

    slide_statement(prs,
        "THE SINGLE QUESTION", "02 · STRATEGIC PROBLEM",
        [rt("How do we open the first 3% in a way that makes the other "),
         rt("97% feel inevitable?", highlight=True)],
        dark=True, size=FS_STATEMENT_T)

    # ─── 03 · AUDIENCE ──────────────────────────────────
    slide_divider(prs, "03",
        "03 · WHO THE WORK IS REALLY FOR", "AUDIENCE MODEL",
        [rt("Three audience rings. "), rt("One park.", highlight=True)],
        "Three audience rings sit around the work. Each one has a different reason to be "
        "there and a different thing it needs to walk away with. The platform has to move "
        "all three forward without speaking to any of them in isolation.",
        dark=False)

    slide_ring(prs,
        "RING A", "CORE",
        "A · CORE",
        "Investors, developers, partners, and media.",
        "The audience whose confidence funds the next phase of the masterplan. They tend "
        "to visit during the day, often on programmed tours, and they read the park as a "
        "signal of whether the company can deliver what it promises.",
        "What they need to feel",
        "That New Murabba can actually deliver: at scale, on time, and with taste. The park is the evidence.")

    slide_ring(prs,
        "RING B", "PRIMARY",
        "B · PRIMARY",
        "New Murabba employees, neighbors, Riyadh families.",
        "The audience whose habits decide whether the park becomes a real destination or "
        "stays a one-time visit. They show up in the evening, in pairs and in groups, and "
        "they judge the park on how it feels and on whether they want to come back.",
        "What they need to feel",
        "That the park is built for them and welcomes them in. The kind of place where they belong, not one they pass through.")

    slide_ring(prs,
        "RING C", "SECONDARY",
        "C · SECONDARY",
        "Event and entertainment seekers, drawn to the amphitheater.",
        "The audience whose social proof spreads the destination further than any campaign "
        "can. They come for an anchor moment like a concert, a festival, or a programmed "
        "evening, and they judge the park by the energy of the crowd they are in.",
        "What they need to feel",
        "That this is one of the few places in Riyadh where the night is actually happening, and a setting they are happy to be seen in.")

    slide_statement(prs,
        "THE THROUGH-LINE", "03 · AUDIENCE",
        [rt("Different audiences, different shifts, "),
         rt("same park.", highlight=True)],
        sub="The job of the platform is to make sure that each of the three rings finds "
            "their own version of the same idea. Not three campaigns running in parallel, "
            "but one idea that bends to each audience and still holds its shape.",
        size=FS_STATEMENT)

    # ─── 04 · DESTINATION PROMISE ───────────────────────
    slide_divider(prs, "04",
        "04 · WHAT THE PARK STANDS FOR", "DESTINATION PROMISE",
        [rt("From a place "), rt("to a destination.", highlight=True)],
        "Four truths the park is being built to deliver on. The creative platform has to "
        "carry all four at once, more like four readings of one idea than four separate "
        "campaigns. Think of these as the briefs underneath the brief.",
        dark=True)

    slide_two_cards(prs,
        "TRUTH 01 & 02", "SOCIAL · ENVIRONMENTAL",
        [
            {"n": "Social · Human Wellbeing",
             "h": "A public square Riyadh has been missing.",
             "p": "Built for people of all ages to gather in, rather than for one age group or one income bracket. The work should feel welcoming first and impressive second."},
            {"n": "Environmental · Humans in Element",
             "h": "A living framework for sustainability.",
             "p": "Native planting, water recycling, low-carbon materials, and air-quality systems. Sustainability is not a section of the messaging here, it is the texture of the place itself. The work has to make all of it visible without lecturing anyone about it."},
        ], dark=True)

    slide_two_cards(prs,
        "TRUTH 03 & 04", "CULTURAL · ECONOMIC",
        [
            {"n": "Cultural · Human Expression",
             "h": "A Riyadh park, clearly ours.",
             "p": "The cultural layer (sound, scent, public art, performance) has to feel local, contemporary, and clearly Saudi. The work should read as Riyadh first and international second."},
            {"n": "Economic · Human Potential",
             "h": "A working argument for everything around it.",
             "p": "Driving visitation, dwell time, and lifting the value of the surrounding plots. The park is also a live demonstration of what the rest of the development will become. The work should leave investors and partners feeling that the rest of the masterplan is a safer bet because of what they just walked through."},
        ], dark=True)

    # ─── 05 · VISITOR ARC ───────────────────────────────
    slide_divider(prs, "05",
        "05 · THE EMOTIONAL ARCHITECTURE", "VISITOR ARC",
        [rt("A park "), rt("where you belong.", highlight=True)],
        "The visitor journey is designed as an emotional arc that balances stimulation "
        "with rest, discovery with familiarity, and movement with pause. The creative "
        "work should follow the same arc, rather than flatten it into a single mood.",
        dark=False)

    slide_arc(prs,
        "THE SIX STAGES", "05 · VISITOR ARC",
        [
            {"name": "Arrival",    "emotion": "Curiosity",   "energy": "Low"},
            {"name": "Discovery",  "emotion": "Wonder",      "energy": "Rising"},
            {"name": "Engagement", "emotion": "Joy",         "energy": "High"},
            {"name": "Pause",      "emotion": "Calm",        "energy": "Medium"},
            {"name": "Connection", "emotion": "Belonging",   "energy": "Sustained"},
            {"name": "Return",     "emotion": "Anticipation","energy": "Low"},
        ])

    slide_two_col_reading(prs,
        "HOW TO READ THE ARC", "05 · VISITOR ARC",
        "Why this matters for the work",
        "A campaign that hits one emotional note will burn out quickly. The platform "
        "should behave the way the park does. A quiet mode and a loud mode. A daytime "
        "register and a nighttime register. A feel for the first visit and a different "
        "feel for the tenth.",
        "What it unlocks",
        "Six stages give the creative team six places to enter the story. Six different "
        "spots where a film, a still, a post, or a moment can live. The arc works as a "
        "content map as much as it does a visitor journey.")

    # ─── 06 · STRATEGIC FRAME ───────────────────────────
    slide_divider(prs, "06",
        "06 · THE PLATFORM BRIEF", "STRATEGIC FRAME",
        [rt("What the "), rt("creative platform", highlight=True), rt(" has to do.")],
        "The frame the creative team will build on. These are the shapes the answer has "
        "to fit, rather than the answer itself. Five demands the platform has to meet "
        "to be the right one.",
        dark=True)

    demands = [
        ("DEMAND 01", "It has to scale across phases, audiences, and time.",
         "The platform should work for the brand across every phase of the park rollout, across all three audience rings, and into the chapters that come after. The Experience Center, the rest of the linear park system, and the wider downtown. An idea that only works for the opening will not be enough."),
        ("DEMAND 02", "It has to power ongoing thought leadership.",
         "The platform should give the brand a place to publish from. Articles, opinion pieces, short films, and talks on smart city living, Riyadh's urban future, sustainability as experience, and the cultural fabric of public space. A campaign idea on its own is not enough. The platform has to behave like an editorial position the brand can defend over time."),
        ("DEMAND 03", "It has to read as a destination, not a development.",
         "The work should feel like Domino Park, the High Line, South Bank, or Madrid Río. Peer to the world's best public spaces, rather than a polished real-estate render. Tone is a strategic decision here, not an aesthetic one. The platform should read as a place first and a project second."),
        ("DEMAND 04", "It has to make sustainability feel like atmosphere.",
         "The work should surface the visible sustainability layer (native planting, smog-free design, local materials, water recycling) as texture and feeling rather than as a list of credentials. The audience should leave with a sensation of the place first, and the credentials should arrive afterwards as confirmation."),
        ("DEMAND 05", "It has to set up what comes next.",
         "The platform should leave the audience leaning forward, already curious about what comes after the park. The park is chapter one of the public-facing rollout. The Experience Center is chapter two. The work needs to plant chapter two inside chapter one, without naming it outright."),
    ]
    for label, h, p in demands:
        slide_single_panel(prs,
            label, "06 · STRATEGIC FRAME",
            label, h, [p], dark=True)

    # ─── 07 · BENCHMARK READS ───────────────────────────
    slide_divider(prs, "07",
        "07 · WHAT THE WORLD'S BEST PARKS DID", "BENCHMARK READS",
        [rt("Seven parks. "), rt("Seven lessons", highlight=True), rt(" on communication.")],
        "A tight read on how seven of the world's most-watched park launches talked "
        "about themselves and positioned the place. Each one offers a different lesson "
        "on tone, positioning, and what to actually communicate. These are the moves "
        "worth borrowing.",
        dark=False)

    parks = [
        ("The High Line", "New York, USA",
         "Not as a park, but as a cultural institution. A new home for art, performance, and architecture, with its own membership organisation (Friends of the High Line) and a constant rotation of programming.",
         "Programming is the marketing. If the calendar of what is happening on the park renews itself, the press story renews with it. A park does not have to be a one-time launch."),
        ("Madrid Río", "Madrid, Spain",
         "As a civic recovery story. The park was framed as land that the city won back from a motorway, told through strong before-and-after photography and a clear sense of civic pride.",
         "Own a transformation arc. If the audience can see the city changing, the work does not have to argue that it is changing. The pictures carry the argument."),
        ("Cheonggyecheon", "Seoul, South Korea",
         "As a city remembering itself. A buried stream uncovered after decades, tied to a wider story about who Seoul wanted to be next. Heritage was used to argue the future, not to look backwards.",
         "A park can carry a city's argument about who it wants to be. The communication can punch well above the size of the physical place when the bigger idea is genuinely there."),
        ("Promenade Plantée", "Paris, France",
         "Quietly. There was almost no formal launch campaign at all. The park sold itself through word of mouth, guidebooks, and the kind of slow, confident press a Paris project tends to attract.",
         "Restraint can read as confidence. Some of the strongest moves on this launch will be the ones we choose not to make. Not everything has to be shouted."),
        ("Domino Park", "Brooklyn, USA",
         "As a park built to be shared. The bocce courts, taco stand, water playground, and signature swings each became landmarks of their own, designed to be photographed before anyone wrote a brief about them.",
         "Design specific moments that are worth photographing. Engineer the picture before the photographer arrives. A handful of hero objects will do more for reach than any media plan."),
        ("South Bank", "London, UK",
         "As a cultural quarter rather than as a park. The communication is tied to everything happening on the strip (Royal Festival Hall, the BFI, the National Theatre, the skate park) and behaves more like a city neighbourhood than a single attraction.",
         "A destination is a calendar before it is a place. What is happening tomorrow does more work than what was built yesterday. The platform should make the calendar legible."),
        ("Chicago Riverwalk", "Chicago, USA",
         "As a civic project told through its design system. The wayfinding, signage, materials, and public art carry the brand more than any marketing campaign does. The place looks coherent before you read a word.",
         "The brand can come out of the place itself, not just sit on top of it. Get the in-park design language right and the communication has a built-in look it can borrow from."),
    ]
    for name, city, positioning, takeaway in parks:
        slide_bench(prs, "BENCHMARK READ", "07 · BENCHMARK READS",
                   name, city, positioning, takeaway)

    slide_statement(prs,
        "THE PATTERN UNDERNEATH ALL SEVEN", "07 · BENCHMARK READS",
        [rt("The strongest park launches happen when positioning, programming, and design all "),
         rt("speak with one voice.", highlight=True)],
        sub="That is the bar the platform is working to. Not one of these on its own, "
            "but the alignment of all three across the next few years of the linear park rollout.",
        size=FS_STATEMENT)

    # ─── 08 · OBJECTIVES ────────────────────────────────
    slide_divider(prs, "08",
        "08 · WHAT SUCCESS LOOKS LIKE", "CAMPAIGN OBJECTIVES",
        [rt("Four outcomes the work will "), rt("be judged against.", highlight=True)],
        "Four outcomes that come straight out of the brief. Strategic enough to guide "
        "creative choices and specific enough to tell whether the work is actually doing "
        "its job.",
        dark=True)

    slide_objectives(prs,
        "FOUR OUTCOMES", "08 · CAMPAIGN OBJECTIVES",
        [
            {"what": "Establish the park as a recognisable destination platform.",
             "measure": "Unprompted name recall, earned media, category share of voice."},
            {"what": "Build emotional connection and a sense of community belonging.",
             "measure": "Sentiment, UGC volume, returning visit rate, qualitative reads."},
            {"what": "Drive consistent footfall and repeat visitation.",
             "measure": "Visit volume, day and night split, repeat-visit ratio, dwell time."},
            {"what": "Build anticipation for the Experience Center as the next public asset.",
             "measure": "Forward intent, sign-up and waitlist signals, partner inbound."},
        ], dark=True)

    # ─── 09 · GUARDRAILS ────────────────────────────────
    slide_divider(prs, "09",
        "09 · WHAT TO AVOID", "GUARDRAILS",
        [rt("Things the work "), rt("should not become.", highlight=True)],
        "A short list of moves the platform should avoid. The point is to be clear about "
        "it now, rather than discover it in revisions. Cutting these out early gives the "
        "creative team room to be specific.",
        dark=False)

    slide_two_cards(prs,
        "GUARDRAILS 01 & 02", "09 · GUARDRAILS",
        [
            {"n": "Guardrail 01",
             "h": "A real-estate launch.",
             "p": "Skip the floorplate language, the project numbers used as headlines, and the renderings dressed up as photography. The park is a destination first and an asset second."},
            {"n": "Guardrail 02",
             "h": "A generic mega-project ad.",
             "p": "No sweeping drone-and-piano-music film about a bigger tomorrow. The category is already full of those. The work has to feel like a specific Riyadh place, not a vision film that could play in any city."},
        ])

    slide_two_cards(prs,
        "GUARDRAILS 03 & 04", "09 · GUARDRAILS",
        [
            {"n": "Guardrail 03",
             "h": "A sustainability lecture.",
             "p": "No stacking up of credentials. The sustainability work is already real and visible in the park itself. Let the audience feel it as atmosphere first, and name it as proof only later."},
            {"n": "Guardrail 04",
             "h": "A single-phase idea.",
             "p": "An idea that only works for the opening will not be the one. The platform has to keep working across the rest of the linear park, the Experience Center, and the wider downtown when those start to arrive."},
        ])

    # ─── 10 · HANDOFF ───────────────────────────────────
    slide_divider(prs, "10",
        "10 · TO THE CREATIVE TEAM", "HANDOFF",
        [rt("The "), rt("creative approach", highlight=True), rt(" takes it from here.")],
        "Strategy ends here and the creative approach starts in the next section. That "
        "is where the platform itself sits. The rest of the deck is best read through "
        "three filters.",
        dark=True)

    slide_filters(prs, "THREE FILTERS", "10 · HANDOFF", dark=True)

    # ─── SAVE ───────────────────────────────────────────
    out = Path(__file__).parent / "Waha - Strategy Approach.pptx"
    prs.save(out)
    print(f"Saved: {out}")
    print(f"Total slides: {len(prs.slides)}")
    return out


if __name__ == "__main__":
    build()
