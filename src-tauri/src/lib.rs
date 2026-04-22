// Generates the HTML export, writes it to a temp file, and opens it in the
// system's default browser. Called from html.html via window.__TAURI__.core.invoke.
#[tauri::command]
fn export_html(html: String) -> Result<(), String> {
    let path = std::env::temp_dir().join("ose_interlinear_export.html");
    std::fs::write(&path, &html).map_err(|e| e.to_string())?;
    opener::open(&path).map_err(|e| e.to_string())
}

// Opens a URL in the system's default browser.
// Used by ext-links.js to handle external links inside the Tauri webview.
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    opener::open(url).map_err(|e| e.to_string())
}

// Shows a native save-file dialog and writes content to the chosen path.
// Returns true if the user saved, false if they cancelled.
// Called from export pages via window.__TAURI__.core.invoke('save_file', {...}).
#[tauri::command]
async fn save_file(
    content: String,
    default_name: String,
    filter_name: String,
    extensions: Vec<String>,
) -> Result<bool, String> {
    let ext_refs: Vec<&str> = extensions.iter().map(String::as_str).collect();
    let handle = rfd::AsyncFileDialog::new()
        .set_file_name(&default_name)
        .add_filter(&filter_name, &ext_refs)
        .save_file()
        .await;
    match handle {
        Some(path) => {
            std::fs::write(path.path(), content.as_bytes()).map_err(|e| e.to_string())?;
            Ok(true)
        }
        None => Ok(false),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![export_html, open_url, save_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
