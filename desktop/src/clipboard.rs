/// Maximum clipboard HTML payload in bytes that we'll pass back to JS.
/// ~67 MB base64 ≈ 50 MB binary — same limit as the JS-side guard.
const MAX_CLIPBOARD_HTML_BYTES: usize = 67_000_000;

/// Returns true if the Windows "HTML Format" clipboard format is currently available,
/// even if the content is too large to read. Used to distinguish "no design data"
/// from "design data present but unreadable (likely too large)".
#[cfg(windows)]
fn html_format_available() -> bool {
    match clipboard_win::register_format("HTML Format") {
        Some(fmt) => clipboard_win::is_format_avail(fmt.get()),
        None => false,
    }
}

#[cfg(not(windows))]
fn html_format_available() -> bool {
    false
}

/// Read the clipboard HTML (CF_HTML on Windows) via arboard, which correctly reads
/// the HTML format that Figma writes design clipboard data to.
/// The tauri-plugin-clipboard-manager only exposes CF_UNICODETEXT reading.
///
/// Returns:
///  - `Ok(Some(text))`                          — within limit, contains design markers
///  - `Ok(None)`                                 — not a design clipboard
///  - `Ok(Some("__OW_CLIPBOARD_TOO_LARGE__"))`  — oversized or unreadable (show toast)
///  - `Err(msg)`                                 — clipboard could not be opened
#[tauri::command]
pub fn read_clipboard_html_limited(_app: tauri::AppHandle) -> Result<Option<String>, String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;

    let text = match clipboard.get().html() {
        Ok(h) if !h.is_empty() => h,
        Ok(_) => {
            // HTML format empty — try plain text fallback.
            match clipboard.get_text() {
                Ok(t) if !t.is_empty() => t,
                _ => return Ok(None),
            }
        }
        Err(_) => {
            // HTML read failed. If the format is available but unreadable, it's
            // likely too large for the Windows clipboard API to GlobalLock.
            if html_format_available() {
                eprintln!("[openweave] Clipboard HTML present but unreadable — likely too large, returning sentinel");
                return Ok(Some("__OW_CLIPBOARD_TOO_LARGE__".into()));
            }
            eprintln!("[openweave] Clipboard HTML not available, trying text");
            match clipboard.get_text() {
                Ok(t) if !t.is_empty() => t,
                _ => {
                    eprintln!("[openweave] Clipboard empty");
                    return Ok(None);
                }
            }
        }
    };

    if !text.contains("(figma)") && !text.contains("(openweave)") {
        eprintln!("[openweave] Clipboard has no design markers — ignoring");
        return Ok(None);
    }

    eprintln!("[openweave] Clipboard design payload: {} bytes (limit {})", text.len(), MAX_CLIPBOARD_HTML_BYTES);

    if text.len() > MAX_CLIPBOARD_HTML_BYTES {
        eprintln!("[openweave] Payload too large — returning sentinel");
        return Ok(Some("__OW_CLIPBOARD_TOO_LARGE__".into()));
    }

    eprintln!("[openweave] Returning payload to JS");
    Ok(Some(text))
}
