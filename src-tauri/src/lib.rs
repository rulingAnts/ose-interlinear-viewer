// Generates the HTML export, writes it to a temp file, and opens it in the
// system's default browser. Called from html.html via window.__TAURI__.core.invoke.
#[tauri::command]
fn export_html(html: String) -> Result<(), String> {
    let path = std::env::temp_dir().join("ose_interlinear_export.html");
    std::fs::write(&path, &html).map_err(|e| e.to_string())?;
    opener::open(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![export_html])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
