# Blame Annotations

See who last modified each line of code.

## Toggle Blame

1. Open a file
2. Run **SVN Blame: Toggle Annotations (Blame)** from Command Palette
3. Or click the blame icon in the editor title bar

## Reading Annotations

Each line shows:

- Revision number
- Author name
- Relative date

## Hover for Details

Hover over any annotation to see:

- Full commit message
- Exact date and time
- Link to view the full commit

## Customize Appearance

Key settings for blame display:

- `sven.blame.dateFormat`: Date format
- `sven.blame.gutter.template`: Gutter text template (`${author}`, `${revision}`, `${date}`, `${message}`)
- `sven.blame.inline.enabled`: Show inline annotations at end of lines
- `sven.blame.inline.template`: Inline annotation template
- `sven.blame.statusBar.enabled`: Show blame info in status bar

## Tip

Blame helps find the right person to ask about code changes.
