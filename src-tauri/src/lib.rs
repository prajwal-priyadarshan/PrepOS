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
        // Hands a .pptx or .docx to whatever Windows opens it with. The reader
        // is pdf.js and always will be; this is the honest alternative to
        // pretending it can render Office files.
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.with_webview(allow_camera_and_microphone);
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Without this, every getUserMedia() call re-shows WebView2's own permission
// bar: wry registers no PermissionRequested handler, so nothing ever calls
// SetState and WebView2 has no answer to remember between launches. The
// camera check is first-party code the user is running against their own
// hardware, not a third-party site - the trusted-app case this handler
// exists for - so camera and microphone are granted without asking, and
// everything else (clipboard, notifications, geolocation, ...) is left on
// WebView2's default handling.
#[cfg(target_os = "windows")]
fn allow_camera_and_microphone(webview: tauri::webview::PlatformWebview) {
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        COREWEBVIEW2_PERMISSION_KIND_CAMERA, COREWEBVIEW2_PERMISSION_KIND_MICROPHONE,
        COREWEBVIEW2_PERMISSION_STATE_ALLOW,
    };
    use webview2_com::PermissionRequestedEventHandler;

    let core = match unsafe { webview.controller().CoreWebView2() } {
        Ok(core) => core,
        Err(_) => return,
    };

    let handler = PermissionRequestedEventHandler::create(Box::new(|_sender, args| {
        if let Some(args) = args {
            let mut kind = Default::default();
            unsafe { args.PermissionKind(&mut kind)? };
            if kind == COREWEBVIEW2_PERMISSION_KIND_CAMERA
                || kind == COREWEBVIEW2_PERMISSION_KIND_MICROPHONE
            {
                unsafe { args.SetState(COREWEBVIEW2_PERMISSION_STATE_ALLOW)? };
            }
        }
        Ok(())
    }));

    let mut token = 0i64;
    let _ = unsafe { core.add_PermissionRequested(&handler, &mut token) };
}
