#[cfg(not(unix))]
compile_error!("This first slice requires POSIX descriptor-based filesystem access; Windows support is not implemented");
pub mod mcp;
pub mod project;
pub mod scoped_fs;
use project::Session;
use serde_json::{json, Value};
use std::sync::Mutex;
use tauri::State;
fn run_command(
    state: State<'_, Mutex<Session>>,
    method: &str,
    args: Value,
) -> Result<Value, String> {
    state
        .lock()
        .map_err(|_| "Project state lock failed")?
        .dispatch(method, &args)
}
#[tauri::command]
fn open_project(state: State<'_, Mutex<Session>>, path: String) -> Result<Value, String> {
    run_command(state, "open_project", json!({"path":path}))
}
#[tauri::command]
fn read_project(state: State<'_, Mutex<Session>>) -> Result<Value, String> {
    run_command(state, "read_project", json!({}))
}
#[tauri::command]
fn list_proposals(state: State<'_, Mutex<Session>>) -> Result<Value, String> {
    run_command(state, "list_proposals", json!({}))
}
#[tauri::command]
fn read_asset(state: State<'_, Mutex<Session>>, id: String) -> Result<Value, String> {
    run_command(state, "read_asset", json!({"id":id}))
}
#[tauri::command]
fn record_validation(
    state: State<'_, Mutex<Session>>,
    id: String,
    revision: u64,
    snapshot: project::Proposal,
    report: Value,
) -> Result<Value, String> {
    run_command(
        state,
        "record_validation",
        json!({"id":id,"revision":revision,"snapshot":snapshot,"report":report}),
    )
}
#[tauri::command]
fn accept_proposal(
    state: State<'_, Mutex<Session>>,
    id: String,
    revision: u64,
) -> Result<Value, String> {
    run_command(
        state,
        "accept_proposal",
        json!({"id":id,"revision":revision}),
    )
}
#[tauri::command]
fn editor_proposal(
    state: State<'_, Mutex<Session>>,
    revision: u64,
    card_id: String,
    body: Option<String>,
    variant_id: Option<String>,
    kind: String,
) -> Result<Value, String> {
    run_command(
        state,
        "editor_proposal",
        json!({"revision":revision,"cardId":card_id,"body":body,"variantId":variant_id,"kind":kind}),
    )
}
#[tauri::command]
fn recover_lock(state: State<'_, Mutex<Session>>) -> Result<Value, String> {
    run_command(state, "recover_lock", json!({}))
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(Session::default()))
        .invoke_handler(tauri::generate_handler![
            recover_lock,
            open_project,
            read_project,
            list_proposals,
            read_asset,
            record_validation,
            accept_proposal,
            editor_proposal
        ])
        .run(tauri::generate_context!())
        .expect("Artificer runtime failed");
}
