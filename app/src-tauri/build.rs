fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "recover_lock",
            "open_project",
            "read_project",
            "list_proposals",
            "read_asset",
            "record_validation",
            "accept_proposal",
            "editor_proposal",
        ]),
    ))
    .expect("Tauri build configuration failed");
}
