from pathlib import Path


WIDGET = Path(__file__).parents[1] / "le-search-widget.js"


def test_homepage_search_uses_a_quiet_inline_catalogue_treatment():
    """The homepage widget should read as part of the dark archive, not a floating app card."""
    source = WIDGET.read_text()

    # The public-site typography is Dosis; the search field should belong to it.
    assert "font: 500 17px/1.2 Dosis, Arial, sans-serif !important;" in source

    # Keep the control deliberately flat instead of a rounded/shadowed card.
    panel_css = source.split(".le-panel {", 1)[1].split("}", 1)[0]
    assert "border-radius: 0;" in panel_css
    assert "box-shadow:" not in panel_css

    # Keyboard users still get a clear, restrained focus treatment.
    assert ".le-searchline:focus-within" in source
    assert "outline: 1px solid rgba(201,185,135,.52);" in source

    # On Hostinger's narrow embed frame, retain one compact bar rather than stacking
    # input and collection selector into a second, detached-looking row.
    mobile_css = source.split("@media (max-width: 620px)", 1)[1]
    assert ".le-top { grid-template-columns: minmax(0, 1fr) 112px; }" in mobile_css
    assert ".le-select-wrap { border-left: 1px solid var(--line); border-top: 0; height: auto; }" in mobile_css


def test_homepage_search_is_compact_and_translucent_before_focus():
    """Idle search should let the homepage art show through and stay visually small."""
    source = WIDGET.read_text()
    panel_css = source.split(".le-panel {", 1)[1].split("}", 1)[0]

    assert "background: rgba(7, 8, 10, .24);" in panel_css
    assert ".le-panel:focus-within" in source
    assert "background: rgba(7, 8, 10, .52);" in source
    box_css = source.split(".le-box {", 1)[1].split("}", 1)[0]
    assert "margin: 10px auto;" in box_css
    assert "padding: 0 4px;" in box_css
    assert "padding: 6px 14px;" in source
    assert "min-height: 28px;" in source
    assert "padding: 10px 18px 12px;" in source


def test_empty_state_invites_catalogue_search_with_useful_terms():
    source = WIDGET.read_text()
    assert "Enter a title, author, subject, or collection." in source
    assert "Start typing to search the catalogue." not in source
