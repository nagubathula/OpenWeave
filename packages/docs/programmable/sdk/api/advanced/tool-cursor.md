---
title: toolCursor
description: Helper that resolves the cursor string for an editor tool.
---

# toolCursor

`toolCursor(tool, override?)` maps an editor tool to the cursor the SDK should use, while still allowing an explicit override.

Use it when building custom canvas shells or tool UIs that need consistent cursor behavior.

## Related APIs

- [useCanvas](../hooks/use-canvas)
- [useEditorCommands](../hooks/use-editor-commands)
