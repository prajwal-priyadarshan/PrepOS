// The entire Rust surface of this app.
//
// There is deliberately no `grant_vault` command here. Filesystem scope for the
// user-picked vault is handled by two things that already exist:
//
//   1. tauri-plugin-dialog calls `scope.allow_directory(path, recursive)` itself
//      when the user picks a folder, so the first pick is granted for free.
//   2. tauri-plugin-persisted-scope saves that runtime scope and restores it on
//      the next launch. Without it the fs plugin rebuilds an empty scope in its
//      own setup() every start, and the vault would fail on the second launch.
//
// Registration order matters: persisted-scope restores into the fs plugin's
// scope, so fs must be initialised first.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_persisted_scope::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
