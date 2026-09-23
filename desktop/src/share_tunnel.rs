use serde::Serialize;
use std::{
    io::{BufRead, BufReader},
    process::{Child, Command, Stdio},
    sync::{mpsc, Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::Manager;

/// Fallback port for dev builds, where the frontend is served by the Next dev
/// server (tauri.conf.json `devUrl`) instead of embedded assets.
const DEV_SERVER_PORT: u16 = 1420;
const NGROK_START_TIMEOUT: Duration = Duration::from_secs(20);

pub struct ShareTunnelState(pub Mutex<Option<TunnelHandle>>);

pub struct TunnelHandle {
    url: String,
    child: Option<Child>,
    server: Option<Arc<tiny_http::Server>>,
}

fn kill_stale_ngrok() {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", "ngrok.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    #[cfg(not(windows))]
    {
        let _ = Command::new("pkill").args(["-x", "ngrok"]).output();
    }
}

fn check_existing_ngrok(port: u16) -> Option<String> {
    use std::io::{Read, Write};
    use std::net::TcpStream;

    let socket_addr = "127.0.0.1:4040".parse().ok()?;
    let mut stream = TcpStream::connect_timeout(&socket_addr, Duration::from_millis(500)).ok()?;
    stream
        .set_read_timeout(Some(Duration::from_millis(1000)))
        .ok()?;
    stream
        .write_all(b"GET /api/tunnels HTTP/1.1\r\nHost: 127.0.0.1:4040\r\nConnection: close\r\n\r\n")
        .ok()?;

    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;

    let body = response.split("\r\n\r\n").nth(1)?;
    let json: serde_json::Value = serde_json::from_str(body).ok()?;
    let tunnels = json.get("tunnels")?.as_array()?;
    let port_str = port.to_string();
    for tunnel in tunnels {
        let addr = tunnel
            .get("config")
            .and_then(|c| c.get("addr"))
            .and_then(|a| a.as_str())
            .unwrap_or("");
        let public_url = tunnel
            .get("public_url")
            .and_then(|u| u.as_str())
            .unwrap_or("");
        if (addr.ends_with(&port_str) || addr.contains(&format!(":{port_str}")))
            && public_url.starts_with("https://")
        {
            return Some(public_url.to_string());
        }
    }
    None
}

#[derive(Clone, Serialize)]
pub struct ShareTunnelInfo {
    pub url: String,
}

/// Serves the embedded frontend assets over plain HTTP on a random localhost
/// port so ngrok has something to tunnel. Collaboration itself is P2P
/// (Trystero/WebRTC); this only hands the invitee a copy of the web app.
fn spawn_asset_server(app: tauri::AppHandle) -> Result<(Arc<tiny_http::Server>, u16), String> {
    let server = tiny_http::Server::http("127.0.0.1:0")
        .map_err(|e| format!("Failed to start local share server: {e}"))?;
    let port = match server.server_addr() {
        tiny_http::ListenAddr::IP(addr) => addr.port(),
        #[cfg(unix)]
        tiny_http::ListenAddr::Unix(_) => return Err("Unexpected unix listener".into()),
    };
    let server = Arc::new(server);
    let handle = server.clone();

    thread::spawn(move || {
        let resolver = app.asset_resolver();
        for request in handle.incoming_requests() {
            let path = request
                .url()
                .split(['?', '#'])
                .next()
                .unwrap_or("/")
                .trim_start_matches('/')
                .to_string();
            // Static-export fallbacks: /share resolves to share.html, and
            // unknown HTML routes fall back to the SPA entry point.
            // Assets with file extensions must 404 rather than returning HTML.
            let has_extension = path.rsplit('/').next().map_or(false, |f| f.contains('.'));
            let candidates = if path.is_empty() {
                vec!["index.html".to_string()]
            } else if has_extension {
                vec![path.clone()]
            } else {
                vec![
                    path.clone(),
                    format!("{path}.html"),
                    format!("{path}/index.html"),
                    "index.html".to_string(),
                ]
            };
            let asset = candidates.into_iter().find_map(|c| resolver.get(c));
            match asset {
                Some(asset) => {
                    let mut response = tiny_http::Response::from_data(asset.bytes);
                    if let Ok(header) = tiny_http::Header::from_bytes(
                        &b"Content-Type"[..],
                        asset.mime_type.as_bytes(),
                    ) {
                        response = response.with_header(header);
                    }
                    if let Ok(header) = tiny_http::Header::from_bytes(
                        &b"Access-Control-Allow-Origin"[..],
                        &b"*"[..],
                    ) {
                        response = response.with_header(header);
                    }
                    let _ = request.respond(response);
                }
                None => {
                    let _ = request.respond(
                        tiny_http::Response::from_string("Not found").with_status_code(404),
                    );
                }
            }
        }
    });

    Ok((server, port))
}

fn spawn_ngrok(port: u16) -> Result<(Child, String), String> {
    let mut cmd = Command::new("ngrok");
    cmd.args([
        "http",
        &port.to_string(),
        "--host-header=rewrite",
        "--log",
        "stdout",
        "--log-format",
        "json",
    ])
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::null());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd.spawn().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            "ngrok not found in PATH".to_string()
        } else {
            format!("Failed to launch ngrok: {e}")
        }
    })?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture ngrok output".to_string())?;

    let (tx, rx) = mpsc::channel::<Result<String, String>>();
    thread::spawn(move || {
        let mut resolved = false;
        // Keep draining stdout after the URL is found so ngrok never blocks on
        // a full pipe while logging tunnel traffic.
        for line in BufReader::new(stdout).lines() {
            let Ok(line) = line else { break };
            if resolved {
                continue;
            }
            let Ok(entry) = serde_json::from_str::<serde_json::Value>(&line) else {
                continue;
            };
            if entry.get("msg").and_then(|m| m.as_str()) == Some("started tunnel") {
                if let Some(url) = entry.get("url").and_then(|u| u.as_str()) {
                    let _ = tx.send(Ok(url.to_string()));
                    resolved = true;
                    continue;
                }
            }
            if entry.get("lvl").and_then(|l| l.as_str()) == Some("crit") {
                let err = entry
                    .get("err")
                    .and_then(|e| e.as_str())
                    .unwrap_or("ngrok failed to start")
                    .to_string();
                let _ = tx.send(Err(err));
                resolved = true;
            }
        }
    });

    match rx.recv_timeout(NGROK_START_TIMEOUT) {
        Ok(Ok(url)) => Ok((child, url)),
        Ok(Err(err)) => {
            let _ = child.kill();
            let _ = child.wait();
            Err(err)
        }
        Err(_) => {
            let _ = child.kill();
            let _ = child.wait();
            Err("Timed out waiting for the ngrok tunnel".to_string())
        }
    }
}

#[tauri::command]
pub async fn start_share_tunnel(app: tauri::AppHandle) -> Result<ShareTunnelInfo, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<ShareTunnelState>();
        if let Some(handle) = state
            .0
            .lock()
            .map_err(|_| "Share tunnel state poisoned".to_string())?
            .as_ref()
        {
            return Ok(ShareTunnelInfo {
                url: handle.url.clone(),
            });
        }

        // Release builds embed the frontend; dev builds serve it from the
        // Next dev server, which ngrok can tunnel directly.
        let is_dev = cfg!(debug_assertions)
            || std::net::TcpStream::connect(("127.0.0.1", DEV_SERVER_PORT)).is_ok();

        let (server, port) = if !is_dev && app.asset_resolver().get("index.html".into()).is_some() {
            let (server, port) = spawn_asset_server(app.clone())?;
            (Some(server), port)
        } else {
            (None, DEV_SERVER_PORT)
        };

        // If an existing ngrok instance is already tunneling this port, adopt it.
        if let Some(existing_url) = check_existing_ngrok(port) {
            *state
                .0
                .lock()
                .map_err(|_| "Share tunnel state poisoned".to_string())? =
                Some(TunnelHandle {
                    url: existing_url.clone(),
                    child: None,
                    server,
                });
            return Ok(ShareTunnelInfo { url: existing_url });
        }

        let spawn_result = spawn_ngrok(port);
        let (child, url) = match spawn_result {
            Ok((c, u)) => (Some(c), u),
            Err(err) if err.contains("ERR_NGROK_334") || err.contains("already online") => {
                kill_stale_ngrok();
                thread::sleep(Duration::from_millis(500));
                let (c, u) = spawn_ngrok(port).map_err(|e| {
                    if let Some(server) = &server {
                        server.unblock();
                    }
                    e
                })?;
                (Some(c), u)
            }
            Err(err) => {
                if let Some(server) = server {
                    server.unblock();
                }
                return Err(err);
            }
        };

        *state
            .0
            .lock()
            .map_err(|_| "Share tunnel state poisoned".to_string())? =
            Some(TunnelHandle {
                url: url.clone(),
                child,
                server,
            });
        Ok(ShareTunnelInfo { url })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn stop_share_tunnel(state: tauri::State<ShareTunnelState>) {
    shutdown(&state.0);
}

#[tauri::command]
pub fn share_tunnel_status(state: tauri::State<ShareTunnelState>) -> Option<String> {
    if let Some(url) = state
        .0
        .lock()
        .ok()
        .and_then(|handle| handle.as_ref().map(|h| h.url.clone()))
    {
        return Some(url);
    }
    check_existing_ngrok(DEV_SERVER_PORT)
}

fn shutdown(state: &Mutex<Option<TunnelHandle>>) {
    let Ok(mut guard) = state.lock() else { return };
    if let Some(mut handle) = guard.take() {
        if let Some(mut child) = handle.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        if let Some(server) = handle.server {
            server.unblock();
        }
    }
    kill_stale_ngrok();
}

pub fn shutdown_share_tunnel(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<ShareTunnelState>() {
        shutdown(&state.0);
    }
}
