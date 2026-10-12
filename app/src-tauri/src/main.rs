#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    let args: Vec<String> = std::env::args().collect();
    if matches!(
        args.get(1).map(String::as_str),
        Some("--mcp" | "--test-bridge")
    ) {
        let test = args[1] == "--test-bridge";
        if args.get(2).map(String::as_str) != Some("--project") || args.len() != 4 {
            eprintln!("Usage: app --mcp --project <explicit-project-folder>");
            std::process::exit(2);
        }
        if let Err(e) = app_lib::mcp::serve(&args[3], test) {
            eprintln!("{e}");
            std::process::exit(1);
        }
    } else {
        app_lib::run();
    }
}
