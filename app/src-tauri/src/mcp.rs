use crate::project::{ProposalEdit, Session};
use serde_json::{json, Value};
use std::io::{self, BufRead, Read, Write};
fn tool(name: &str, description: &str, properties: Value, required: &[&str]) -> Value {
    json!({"name":name,"description":description,"inputSchema":{"type":"object","properties":properties,"required":required,"additionalProperties":false}})
}
fn tools() -> Value {
    json!({"tools":[
        tool("get_project","Read the scoped project",json!({}),&[]),
        tool("get_constraints","Discover template, variant and fixture rules",json!({}),&[]),
        tool("propose_change","Queue a change. Only the editor may accept it",json!({"id":{"type":"string"},"expectedRevision":{"type":"integer"},"cardId":{"type":"string"},"body":{"type":"string"},"title":{"type":"string"},"variantId":{"type":"string"}}),&["id","expectedRevision","cardId"]),
        tool("get_proposal","Read proposal and actual editor validation, including not-run",json!({"id":{"type":"string"}}),&["id"]),
        tool("commit_proposal","Request acceptance; initial agent edits always require editor acceptance",json!({"id":{"type":"string"}}),&["id"]),
        tool("propose_undo","Queue undo for the same measured editor acceptance pipeline",json!({"id":{"type":"string"},"expectedRevision":{"type":"integer"}}),&["id","expectedRevision"])
    ]})
}
fn call(session: &mut Session, name: &str, args: &Value) -> Result<Value, String> {
    let allowed: &[&str] = match name {
        "get_project" | "get_constraints" => &[],
        "propose_change" => &[
            "id",
            "expectedRevision",
            "cardId",
            "body",
            "variantId",
            "title",
        ],
        "get_proposal" | "commit_proposal" => &["id"],
        "propose_undo" => &["id", "expectedRevision"],
        _ => return Err("Unknown MCP tool".into()),
    };
    if !args.is_object()
        || args
            .as_object()
            .unwrap()
            .keys()
            .any(|k| !allowed.contains(&k.as_str()))
    {
        return Err("Unknown or invalid tool argument".into());
    }
    let id = || {
        args["id"]
            .as_str()
            .ok_or_else(|| "Missing proposal ID".to_string())
    };
    let rev = || {
        args["expectedRevision"]
            .as_u64()
            .ok_or_else(|| "Missing revision".to_string())
    };
    match name {
        "get_project" => session.project(),
        "get_constraints" => Ok(json!({"templates":session.project()?["templates"]})),
        "propose_change" => {
            let body = if args["body"].is_null() {
                None
            } else {
                Some(args["body"].as_str().ok_or("Invalid body")?.to_string())
            };
            let variant = if args["variantId"].is_null() {
                None
            } else {
                Some(
                    args["variantId"]
                        .as_str()
                        .ok_or("Invalid variant")?
                        .to_string(),
                )
            };
            serde_json::to_value(session.propose_with_title(
                id()?,
                rev()?,
                args["cardId"].as_str().ok_or("Missing card ID")?,
                ProposalEdit {
                    body,
                    variant_id: variant,
                    title: if args["title"].is_null() {
                        None
                    } else {
                        Some(args["title"].as_str().ok_or("Invalid title")?.to_string())
                    },
                },
                "edit",
            )?)
            .map_err(|e| e.to_string())
        }
        "propose_undo" => {
            serde_json::to_value(session.propose(id()?, rev()?, "", None, None, "undo")?)
                .map_err(|e| e.to_string())
        }
        "get_proposal" => Ok(
            json!({"proposal":session.get_proposal(id()?)?,"validation":session.validation(id()?)?}),
        ),
        "commit_proposal" => {
            session.get_proposal(id()?)?;
            Ok(json!({"status":"editor-acceptance-required","committed":false}))
        }
        _ => Err("Unknown MCP tool".into()),
    }
}
pub fn request(session: &mut Session, input: &Value) -> Option<Value> {
    if input["jsonrpc"] != "2.0"
        || !input["method"].is_string()
        || input
            .get("id")
            .is_some_and(|id| !id.is_string() && !id.is_number() && !id.is_null())
        || input.get("params").is_some_and(|p| !p.is_object())
    {
        return Some(
            json!({"jsonrpc":"2.0","id":null,"error":{"code":-32600,"message":"Invalid JSON-RPC request"}}),
        );
    }
    let id = input.get("id")?.clone();
    let method = input["method"].as_str().unwrap_or("");
    let params = &input["params"];
    if method == "initialize"
        && (!params["protocolVersion"].is_string()
            || !params["capabilities"].is_object()
            || !params["clientInfo"].is_object())
    {
        return Some(
            json!({"jsonrpc":"2.0","id":id,"error":{"code":-32602,"message":"Invalid initialize parameters"}}),
        );
    }
    let result: Result<Value, String> = match method {
        "initialize" => Ok(
            json!({"protocolVersion":"2025-11-25","capabilities":{"tools":{}},"serverInfo":{"name":"artificer-local","version":"0.1.0"}}),
        ),
        "ping" => Ok(json!({})),
        "tools/list" => Ok(tools()),
        "tools/call" => {
            let args = params.get("arguments").cloned().unwrap_or(json!({}));
            match call(session, params["name"].as_str().unwrap_or(""), &args) {
                Ok(value) => Ok(
                    json!({"content":[{"type":"text","text":value.to_string()}],"structuredContent":value,"isError":false}),
                ),
                Err(error) => Ok(json!({"content":[{"type":"text","text":error}],"isError":true})),
            }
        }
        _ => Err("Unknown MCP method".into()),
    };
    Some(match result {
        Ok(result) => json!({"jsonrpc":"2.0","id":id,"result":result}),
        Err(message) => json!({"jsonrpc":"2.0","id":id,"error":{"code":-32601,"message":message}}),
    })
}
pub fn serve(path: &str, test_bridge: bool) -> Result<(), String> {
    if test_bridge && !cfg!(feature = "test-bridge") {
        return Err("Test bridge is unavailable in production builds".into());
    }
    let mut session = Session::default();
    session.open(path)?;
    let stdin = io::stdin();
    let mut reader = stdin.lock();
    let mut stdout = io::stdout().lock();
    let (mut negotiated, mut initialized) = (false, false);
    loop {
        let mut bytes = vec![];
        let count = (&mut reader)
            .take(100_001)
            .read_until(b'\n', &mut bytes)
            .map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        if count > 100_000 {
            return Err("MCP message size limit".into());
        }
        let input: Value = match serde_json::from_slice(&bytes) {
            Ok(v) => v,
            Err(_) => {
                writeln!(stdout,"{}",json!({"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"Invalid JSON"}})).map_err(|e|e.to_string())?;
                stdout.flush().map_err(|e| e.to_string())?;
                continue;
            }
        };
        let response = if test_bridge {
            #[cfg(feature = "test-bridge")]
            {
                Some(
                    match session.dispatch(input["method"].as_str().unwrap_or(""), &input["args"]) {
                        Ok(value) => json!({"id":input["id"],"result":value}),
                        Err(error) => json!({"id":input["id"],"error":error}),
                    },
                )
            }
            #[cfg(not(feature = "test-bridge"))]
            {
                return Err("Test bridge unavailable".into());
            }
        } else {
            let method = input["method"].as_str().unwrap_or("");
            if input["jsonrpc"] == "2.0"
                && method == "notifications/initialized"
                && negotiated
                && input.get("id").is_none()
            {
                initialized = true;
                None
            } else if input["jsonrpc"] == "2.0" && method.starts_with("tools/") && !initialized {
                Some(
                    json!({"jsonrpc":"2.0","id":input["id"],"error":{"code":-32002,"message":"Initialize before using tools"}}),
                )
            } else {
                let response = request(&mut session, &input);
                if method == "initialize"
                    && response.as_ref().is_some_and(|v| v.get("result").is_some())
                {
                    negotiated = true;
                }
                response
            }
        };
        if let Some(response) = response {
            writeln!(stdout, "{response}").map_err(|e| e.to_string())?;
            stdout.flush().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
