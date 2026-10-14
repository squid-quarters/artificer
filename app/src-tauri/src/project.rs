use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};
#[cfg(test)]
use std::{
    fs,
    path::{Path, PathBuf},
};
type Result<T> = std::result::Result<T, String>;
const MAX_BODY_BYTES: usize = 20_000;
static NONCE: AtomicU64 = AtomicU64::new(0);
pub(crate) fn nonce() -> String {
    format!(
        "{}-{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos(),
        NONCE.fetch_add(1, Ordering::Relaxed)
    )
}
fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn payload_hash(proposal: &Proposal) -> Result<String> {
    let mut payload = json!({"id":proposal.id,"expectedRevision":proposal.expected_revision,"expectedProjectHash":proposal.expected_project_hash,"cardId":proposal.card_id,"body":proposal.body,"variantId":proposal.variant_id,"kind":proposal.kind});
    // Omit absent title changes to preserve durable receipts from older releases.
    if let Some(title) = &proposal.title {
        payload["title"] = json!(title);
    }
    Ok(hash(&serde_json::to_vec(&payload).map_err(err)?))
}
fn id_ok(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 80
        && id
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
}
fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Proposal {
    pub id: String,
    pub expected_revision: u64,
    pub expected_project_hash: String,
    pub card_id: String,
    pub body: Option<String>,
    pub variant_id: Option<String>,
    pub kind: String,
    pub status: String,
    pub accepted_revision: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}
#[derive(Default)]
pub struct Session {
    pub root: Option<crate::scoped_fs::Root>,
    prepared: HashMap<String, (u64, String, String)>,
}
impl Session {
    pub fn open(&mut self, path: &str) -> Result<Value> {
        self.root = None;
        self.prepared.clear();
        let root = crate::scoped_fs::Root::open(path)?;
        let trial = Session {
            root: Some(root),
            prepared: HashMap::new(),
        };
        trial.project()?;
        trial.root()?.ensure_directory(".artificer")?;
        trial.root()?.ensure_directory(".artificer/requests")?;
        self.root = trial.root;
        self.prepared.clear();
        self.view()
    }
    fn root(&self) -> Result<&crate::scoped_fs::Root> {
        self.root.as_ref().ok_or("No project is open".into())
    }
    fn bytes(&self, relative: &str) -> Result<Vec<u8>> {
        self.root()?.bytes(relative)
    }
    fn read(&self, relative: &str) -> Result<Value> {
        serde_json::from_slice(&self.bytes(relative)?).map_err(err)
    }
    fn atomic(&self, relative: &str, value: &Value) -> Result<()> {
        self.root()?.atomic(
            relative,
            &serde_json::to_vec_pretty(value).map_err(err)?,
            || Ok(()),
        )
    }
    fn lock(&self) -> Result<crate::scoped_fs::Lock> {
        self.root()?.lock()
    }
    fn view(&self) -> Result<Value> {
        let (mut p, digest) = self.snapshot()?;
        p["contentHash"] = json!(digest);
        Ok(p)
    }
    fn project_hash(&self) -> Result<String> {
        Ok(hash(&self.bytes("project.artificer.json")?))
    }
    pub fn project(&self) -> Result<Value> {
        Ok(self.snapshot()?.0)
    }
    fn snapshot(&self) -> Result<(Value, String)> {
        let bytes = self.bytes("project.artificer.json")?;
        let p: Value = serde_json::from_slice(&bytes).map_err(err)?;
        if p["schemaVersion"] != 1
            || !p["revision"].is_u64()
            || !p["cards"].is_array()
            || !p["templates"].is_array()
            || !p["assets"].is_array()
            || !p["history"].is_array()
        {
            return Err("Unsupported or invalid project schema".into());
        }
        if !p.get("printProfile").is_some_and(Value::is_null) {
            return Err("Print profiles are not implemented in this slice".into());
        }
        if p["cards"].as_array().unwrap().len() != 1
            || p["history"]
                .as_array()
                .unwrap()
                .iter()
                .any(|h| h["cards"].as_array().is_none_or(|c| c.len() != 1))
        {
            return Err(
                "First slice supports exactly one card per project/history snapshot".into(),
            );
        }

        if p["revision"]
            .as_u64()
            .is_none_or(|v| v > 9_007_199_254_740_991)
        {
            return Err("Revision exceeds JSON safe integer range".into());
        }
        if !p["acceptedCommands"].is_null() && !p["acceptedCommands"].is_object() {
            return Err("Invalid accepted command journal".into());
        }
        let card = &p["cards"][0];
        let current_template = p["templates"]
            .as_array()
            .unwrap()
            .iter()
            .find(|t| t["id"] == p["cards"][0]["templateId"])
            .ok_or("Unknown template")?;

        for h in p["history"].as_array().unwrap() {
            if h["cards"][0]["id"] != card["id"]
                || h["cards"][0]["templateId"] != card["templateId"]
                || h["cards"][0]["title"].as_str().is_none_or(|s| {
                    current_template.get("titleRegion").is_some() && s.len() > MAX_BODY_BYTES
                })
                || h["cards"][0]["body"]
                    .as_str()
                    .is_none_or(|s| s.len() > MAX_BODY_BYTES)
            {
                return Err("Invalid single-card undo history".into());
            }
        }
        for t in p["templates"].as_array().unwrap() {
            if t.get("titleRegion").is_some()
                || t.get("titleFontPx").is_some()
                || t.get("titleLineHeightPx").is_some()
            {
                if !t["titleLineHeightPx"]
                    .as_f64()
                    .is_some_and(|v| v > 0.0 && v <= 2000.0)
                {
                    return Err("Invalid title line height".into());
                }
                let region = &t["titleRegion"];
                for key in ["x", "y", "width", "height"] {
                    if !region[key]
                        .as_f64()
                        .is_some_and(|v| v >= 0.0 && v <= 2000.0)
                    {
                        return Err("Invalid title region".into());
                    }
                }
                if region["width"].as_f64().unwrap() <= 0.0
                    || region["height"].as_f64().unwrap() <= 0.0
                    || region["x"].as_f64().unwrap() + region["width"].as_f64().unwrap()
                        > t["width"].as_f64().unwrap_or(0.0)
                    || region["y"].as_f64().unwrap() + region["height"].as_f64().unwrap()
                        > t["height"].as_f64().unwrap_or(0.0)
                    || !t["titleFontPx"]
                        .as_f64()
                        .is_some_and(|v| v > 0.0 && v <= 2000.0)
                {
                    return Err("Invalid title region/font".into());
                }
            }
            for key in ["width", "height", "fontPx", "minFontPx"] {
                if !t[key].as_f64().is_some_and(|v| v > 0.0 && v <= 2000.0) {
                    return Err("Invalid template geometry/font constraint".into());
                }
            }
            if t["fontPx"].as_f64() < t["minFontPx"].as_f64() {
                return Err("Template font below its declared minimum".into());
            }
            for key in ["x", "y", "width", "height"] {
                if !t["body"][key]
                    .as_f64()
                    .is_some_and(|v| (0.0..=2000.0).contains(&v))
                {
                    return Err("Invalid body region".into());
                }
            }
            if t["body"]["x"].as_f64().unwrap() + t["body"]["width"].as_f64().unwrap()
                > t["width"].as_f64().unwrap()
                || t["body"]["y"].as_f64().unwrap() + t["body"]["height"].as_f64().unwrap()
                    > t["height"].as_f64().unwrap()
            {
                return Err("Body region outside template".into());
            }
            if !t["lastLineMinWords"].is_null()
                && !t["lastLineMinWords"]
                    .as_u64()
                    .is_some_and(|n| (1..=20).contains(&n))
            {
                return Err("Widow constraint must be explicit or null".into());
            }
            if !p["symbols"]
                .as_array()
                .is_some_and(|symbols| symbols.iter().any(|symbol| symbol == &t["symbol"]))
            {
                return Err("Template symbol must match the shared registry".into());
            }
        }
        for h in p["history"].as_array().unwrap() {
            if !current_template["variants"]
                .as_array()
                .is_some_and(|v| v.iter().any(|v| v["id"] == h["cards"][0]["variantId"]))
            {
                return Err("Undo snapshot refers to an unknown variant".into());
            }
        }
        for asset in p["assets"].as_array().unwrap() {
            self.asset_from(&p, asset["id"].as_str().ok_or("Invalid asset ID")?)?;
        }
        for card in p["cards"].as_array().unwrap() {
            if !card["id"].as_str().is_some_and(id_ok)
                || card["title"].as_str().is_none_or(|s| {
                    current_template.get("titleRegion").is_some() && s.len() > MAX_BODY_BYTES
                })
                || card["body"]
                    .as_str()
                    .is_none_or(|s| s.len() > MAX_BODY_BYTES)
            {
                return Err("Invalid card".into());
            }
            let t = p["templates"]
                .as_array()
                .unwrap()
                .iter()
                .find(|t| t["id"] == card["templateId"])
                .ok_or("Unknown template")?;
            if !t["variants"]
                .as_array()
                .ok_or("Invalid variants")?
                .iter()
                .any(|v| v["id"] == card["variantId"])
            {
                return Err("Unknown variant".into());
            }
        }
        Ok((p, hash(&bytes)))
    }
    fn asset_from(&self, p: &Value, id: &str) -> Result<Vec<u8>> {
        let asset = p["assets"]
            .as_array()
            .ok_or("Invalid assets")?
            .iter()
            .find(|a| a["id"] == id)
            .ok_or("Unknown asset")?;
        let path = asset["path"].as_str().ok_or("Invalid asset path")?;
        if !path.starts_with("assets/") || !path.ends_with(".svg") {
            return Err("First slice accepts owned SVG fixture assets only".into());
        }
        let bytes = self.bytes(path)?;
        if bytes.len() > 1_000_000 || asset["sha256"] != hash(&bytes) {
            return Err("Asset hash mismatch or size limit".into());
        }
        let svg = std::str::from_utf8(&bytes)
            .map_err(err)?
            .to_ascii_lowercase();
        if [
            "<script",
            "<foreignobject",
            "href",
            "url(",
            "<!doctype",
            "<?xml-stylesheet",
            "<animate",
        ]
        .iter()
        .any(|pattern| svg.contains(pattern))
        {
            return Err("Only static self-contained SVG fixture assets are supported".into());
        }
        Ok(bytes)
    }
    pub fn asset(&self, id: &str) -> Result<String> {
        let p = self.project()?;
        let bytes = self.asset_from(&p, id)?;
        String::from_utf8(bytes)
            .map(|s| format!("data:image/svg+xml;charset=utf-8,{}", percent_encode(&s)))
            .map_err(err)
    }
    fn proposal_path(id: &str) -> Result<String> {
        if !id_ok(id) {
            return Err("Invalid proposal ID".into());
        }
        Ok(format!(".artificer/requests/{id}.json"))
    }
    pub fn get_proposal(&self, id: &str) -> Result<Proposal> {
        let mut proposal: Proposal =
            serde_json::from_value(self.read(&Self::proposal_path(id)?)?).map_err(err)?;
        proposal.status = "pending".into();
        proposal.accepted_revision = None;
        let project = self.project()?;
        let receipt = &project["acceptedCommands"][id];
        if let Some(revision) = receipt["revision"].as_u64() {
            if receipt["payloadHash"] != payload_hash(&proposal)? {
                return Err("Proposal differs from durable accepted receipt".into());
            }
            proposal.status = "accepted".into();
            proposal.accepted_revision = Some(revision);
        }
        Ok(proposal)
    }
    pub fn list(&self) -> Result<Vec<Proposal>> {
        let mut list = vec![];
        for name in self.root()?.names(".artificer/requests")? {
            if let Some(id) = name.strip_suffix(".json") {
                if id_ok(id) {
                    list.push(self.get_proposal(id)?);
                }
            }
        }
        list.sort_by(|a, b| a.id.cmp(&b.id));
        Ok(list)
    }
    pub fn propose(
        &self,
        id: &str,
        revision: u64,
        card_id: &str,
        body: Option<String>,
        variant_id: Option<String>,
        kind: &str,
    ) -> Result<Proposal> {
        self.propose_with_title(id, revision, card_id, body, variant_id, kind, None)
    }
    pub fn propose_with_title(
        &self,
        id: &str,
        revision: u64,
        card_id: &str,
        body: Option<String>,
        variant_id: Option<String>,
        kind: &str,
        title: Option<String>,
    ) -> Result<Proposal> {
        let _lock = self.lock()?;
        let path = Self::proposal_path(id)?;
        if self.root()?.exists(&path)? {
            let existing = self.get_proposal(id)?;
            if existing.expected_revision == revision
                && existing.card_id == card_id
                && existing.body == body
                && existing.variant_id == variant_id
                && existing.kind == kind
                && existing.title == title
            {
                return Ok(existing);
            }
            return Err("Idempotency key already belongs to a different change".into());
        }
        let (p, digest) = self.snapshot()?;
        if revision != p["revision"].as_u64().unwrap() {
            return Err("Revision conflict".into());
        }
        if kind != "edit" && kind != "undo" {
            return Err("Unsupported change kind".into());
        }
        if body.as_ref().is_some_and(|s| s.len() > MAX_BODY_BYTES) {
            return Err("Rules text size limit".into());
        }
        if title.as_ref().is_some_and(|s| s.len() > MAX_BODY_BYTES) {
            return Err("Title text size limit".into());
        }
        if kind == "undo" && title.is_some() {
            return Err("Undo cannot include title changes".into());
        }
        let request = Proposal {
            id: id.into(),
            expected_revision: revision,
            expected_project_hash: digest,
            card_id: card_id.into(),
            body,
            variant_id,
            kind: kind.into(),
            status: "pending".into(),
            accepted_revision: None,
            title,
        };
        self.apply(&p, &request)?;
        self.atomic(&path, &serde_json::to_value(&request).map_err(err)?)?;
        Ok(request)
    }
    fn apply(&self, p: &Value, proposal: &Proposal) -> Result<Value> {
        if proposal
            .title
            .as_ref()
            .is_some_and(|s| s.len() > MAX_BODY_BYTES)
        {
            return Err("Title text size limit".into());
        }
        if proposal
            .body
            .as_ref()
            .is_some_and(|s| s.len() > MAX_BODY_BYTES)
        {
            return Err("Rules text size limit".into());
        }
        let mut next = p.clone();
        if proposal.kind == "undo" {
            let previous = p["history"]
                .as_array()
                .unwrap()
                .last()
                .ok_or("Nothing to undo")?;
            next["cards"] = previous["cards"].clone();
            return Ok(next);
        }
        let index = p["cards"]
            .as_array()
            .unwrap()
            .iter()
            .position(|c| c["id"] == proposal.card_id)
            .ok_or("Unknown card")?;
        let t = p["templates"]
            .as_array()
            .unwrap()
            .iter()
            .find(|t| t["id"] == p["cards"][index]["templateId"])
            .ok_or("Unknown template")?;
        if let Some(title) = &proposal.title {
            if t.get("titleRegion").is_none() {
                return Err("Title editing requires a declared template region".into());
            }
            next["cards"][index]["title"] = json!(title);
        }
        if let Some(body) = &proposal.body {
            next["cards"][index]["body"] = json!(body);
        }
        if let Some(variant) = &proposal.variant_id {
            if !t["permittedOverrides"]
                .as_array()
                .ok_or("Invalid override policy")?
                .iter()
                .any(|v| v == "variantId")
                || !t["variants"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|v| v["id"] == *variant)
            {
                return Err("Variant override forbidden or unknown".into());
            }
            next["cards"][index]["variantId"] = json!(variant);
        }
        Ok(next)
    }
    pub fn record(
        &mut self,
        id: &str,
        revision: u64,
        rendered: Proposal,
        report: Value,
    ) -> Result<()> {
        let _lock = self.lock()?;
        let (p, digest) = self.snapshot()?;
        let proposal = self.get_proposal(id)?;
        if proposal != rendered {
            return Err("Proposal changed after rendering; preview again".into());
        }
        if p["revision"] != revision
            || proposal.expected_revision != revision
            || proposal.expected_project_hash != digest
        {
            return Err("Revision conflict".into());
        }
        if !matches!(report["status"].as_str(), Some("pass" | "fail"))
            || !report["diagnostics"].is_array()
            || report["environment"].as_str().is_none_or(|s| s.is_empty())
        {
            return Err("Invalid rendered validation report".into());
        }
        if report["status"] == "pass" && !report["diagnostics"].as_array().unwrap().is_empty() {
            return Err("Passing report contains failures".into());
        }
        self.atomic(&format!(".artificer/requests/{id}.validation"), &json!({"revision":revision,"projectHash":proposal.expected_project_hash,"proposalHash":hash(&serde_json::to_vec(&proposal).map_err(err)?),"report":report}))?;
        self.prepared.remove(id);
        if report["status"] == "pass" {
            self.prepared.insert(
                id.into(),
                (
                    revision,
                    proposal.expected_project_hash.clone(),
                    hash(&serde_json::to_vec(&proposal).map_err(err)?),
                ),
            );
        }
        Ok(())
    }
    pub fn acceptance(&mut self, id: &str, revision: u64) -> Result<Value> {
        let _lock = self.lock()?;
        let mut proposal = self.get_proposal(id)?;
        let authoritative = self.project()?;
        if authoritative["acceptedCommands"][id]["revision"].is_u64() {
            return Ok(authoritative);
        }
        if proposal.status == "accepted" {
            return self.project();
        }
        let (p, digest) = self.snapshot()?;
        let proof = self
            .prepared
            .get(id)
            .ok_or("Editor must validate and accept the rendered preview")?;
        if p["revision"] != revision
            || proposal.expected_revision != revision
            || digest != proof.1
            || revision != proof.0
            || proof.2 != hash(&serde_json::to_vec(&proposal).map_err(err)?)
        {
            return Err("Revision conflict; preview again".into());
        }
        let mut next = self.apply(&p, &proposal)?;
        if proposal.kind == "undo" {
            next["history"].as_array_mut().unwrap().pop();
        } else {
            next["history"]
                .as_array_mut()
                .unwrap()
                .push(json!({"cards":p["cards"],"commandId":id}));
        }
        if revision >= 9_007_199_254_740_991 {
            return Err("Revision limit".into());
        }
        next["revision"] = json!(revision.checked_add(1).ok_or("Revision limit")?);
        // The project is the authoritative commit record, including accepted IDs.
        let accepted = next
            .as_object_mut()
            .unwrap()
            .entry("acceptedCommands")
            .or_insert(json!({}));
        accepted[id] = json!({"revision":revision+1,"payloadHash":payload_hash(&proposal)?});
        self.root()?.atomic(
            "project.artificer.json",
            &serde_json::to_vec_pretty(&next).map_err(err)?,
            || {
                if self.project_hash()? != digest {
                    return Err("External write detected before save".into());
                }
                Ok(())
            },
        )?;
        proposal.status = "accepted".into();
        proposal.accepted_revision = Some(revision + 1);
        self.atomic(
            &Self::proposal_path(id)?,
            &serde_json::to_value(proposal).map_err(err)?,
        )?;
        self.prepared.remove(id);
        Ok(next)
    }
    pub fn validation(&self, id: &str) -> Result<Value> {
        let proposal = self.get_proposal(id)?;
        let path = format!(".artificer/requests/{id}.validation");
        if !self.root()?.exists(&path)? {
            return Ok(json!({"status":"not-run"}));
        }
        let saved = self.read(&path)?;
        if saved["projectHash"] != self.project_hash()?
            || saved["proposalHash"] != hash(&serde_json::to_vec(&proposal).map_err(err)?)
        {
            return Ok(json!({"status":"not-run","reason":"Project changed"}));
        }
        Ok(saved["report"].clone())
    }
    pub fn dispatch(&mut self, method: &str, args: &Value) -> Result<Value> {
        match method {
            "open_project" => self.open(args["path"].as_str().ok_or("Missing project path")?),
            "read_project" => self.view(),
            "recover_lock" => {
                self.root()?.recover_lock()?;
                Ok(Value::Null)
            }
            "list_proposals" => serde_json::to_value(self.list()?).map_err(err),
            "read_asset" => Ok(json!(
                self.asset(args["id"].as_str().ok_or("Missing asset ID")?)?
            )),
            "record_validation" => {
                self.record(
                    args["id"].as_str().ok_or("Missing proposal ID")?,
                    args["revision"].as_u64().ok_or("Missing revision")?,
                    serde_json::from_value(args["snapshot"].clone()).map_err(err)?,
                    args["report"].clone(),
                )?;
                Ok(Value::Null)
            }
            "accept_proposal" => self.acceptance(
                args["id"].as_str().ok_or("Missing proposal ID")?,
                args["revision"].as_u64().ok_or("Missing revision")?,
            ),
            "editor_proposal" => serde_json::to_value(self.propose_with_title(
                &format!("editor-{}", nonce()),
                args["revision"].as_u64().ok_or("Missing revision")?,
                args["cardId"].as_str().ok_or("Missing card ID")?,
                optional_string(args, "body")?,
                optional_string(args, "variantId")?,
                args["kind"].as_str().unwrap_or("edit"),
                optional_string(args, "title")?,
            )?)
            .map_err(err),
            _ => Err("Unknown editor command".into()),
        }
    }
}
fn optional_string(args: &Value, key: &str) -> Result<Option<String>> {
    if args[key].is_null() {
        Ok(None)
    } else {
        args[key]
            .as_str()
            .map(|s| Some(s.into()))
            .ok_or(format!("Invalid {key}"))
    }
}
fn percent_encode(s: &str) -> String {
    s.bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || b"-_.~".contains(&b) {
                (b as char).to_string()
            } else {
                format!("%{b:02X}")
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            let root = std::env::temp_dir().join(format!("artificer-test-{}", nonce()));
            fs::create_dir_all(root.join("assets")).unwrap();
            let source =
                Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/neutral-project");
            fs::copy(
                source.join("project.artificer.json"),
                root.join("project.artificer.json"),
            )
            .unwrap();
            for name in ["grid.svg", "rings.svg"] {
                fs::copy(
                    source.join("assets").join(name),
                    root.join("assets").join(name),
                )
                .unwrap();
            }
            Self(root)
        }
        fn session(&self) -> Session {
            let mut s = Session::default();
            s.open(self.0.to_str().unwrap()).unwrap();
            s
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }
    fn pass() -> Value {
        json!({"status":"pass","diagnostics":[],"environment":"unit test seam"})
    }
    #[test]
    fn title_changes_preserve_authority_receipts_and_undo() {
        let fixture = Fixture::new();
        let mut s = fixture.session();
        let original = s.project().unwrap();
        let proposal = s
            .propose_with_title(
                "title-edit",
                1,
                "fixture-card",
                None,
                None,
                "edit",
                Some("New Focus".into()),
            )
            .unwrap();
        assert!(s.acceptance("title-edit", 1).is_err());
        assert!(s
            .propose_with_title(
                "title-edit",
                1,
                "fixture-card",
                None,
                None,
                "edit",
                Some("Other Focus".into())
            )
            .is_err());
        s.record("title-edit", 1, proposal.clone(), pass()).unwrap();
        assert_eq!(
            s.acceptance("title-edit", 1).unwrap()["cards"][0]["title"],
            "New Focus"
        );
        assert_eq!(fixture.session().project().unwrap()["revision"], 2);
        assert_eq!(s.acceptance("title-edit", 1).unwrap()["revision"], 2);
        let path = fixture.0.join(".artificer/requests/title-edit.json");
        let mut tampered = proposal.clone();
        tampered.title = Some("Tampered title".into());
        fs::write(&path, serde_json::to_vec(&tampered).unwrap()).unwrap();
        assert!(s.get_proposal("title-edit").is_err());
        fs::write(&path, serde_json::to_vec(&proposal).unwrap()).unwrap();
        s.propose("undo-title", 2, "", None, None, "undo").unwrap();
        s.record(
            "undo-title",
            2,
            s.get_proposal("undo-title").unwrap(),
            pass(),
        )
        .unwrap();
        let restored = s.acceptance("undo-title", 2).unwrap();
        assert_eq!(restored["cards"], original["cards"]);
        assert_eq!(restored["templates"], original["templates"]);
    }
    #[test]
    fn legacy_templates_proposals_and_receipt_hashes_remain_compatible() {
        let fixture = Fixture::new();
        let path = fixture.0.join("project.artificer.json");
        let mut p: Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        p["templates"][0]
            .as_object_mut()
            .unwrap()
            .remove("titleRegion");
        p["templates"][0]
            .as_object_mut()
            .unwrap()
            .remove("titleFontPx");
        p["templates"][0]
            .as_object_mut()
            .unwrap()
            .remove("titleLineHeightPx");
        p["cards"][0]["title"] = json!(" ".repeat(20_001));
        fs::write(&path, serde_json::to_vec(&p).unwrap()).unwrap();
        let mut s = fixture.session();
        let old = s
            .propose(
                "legacy",
                1,
                "fixture-card",
                Some("Gain two focus.".into()),
                None,
                "edit",
            )
            .unwrap();
        let serialized = serde_json::to_value(&old).unwrap();
        assert!(serialized.get("title").is_none());
        let legacy: Proposal = serde_json::from_value(serialized).unwrap();
        let old_payload = json!({"id":legacy.id,"expectedRevision":legacy.expected_revision,"expectedProjectHash":legacy.expected_project_hash,"cardId":legacy.card_id,"body":legacy.body,"variantId":legacy.variant_id,"kind":legacy.kind});
        assert_eq!(
            payload_hash(&legacy).unwrap(),
            hash(&serde_json::to_vec(&old_payload).unwrap())
        );
        s.record("legacy", 1, legacy, pass()).unwrap();
        s.acceptance("legacy", 1).unwrap();
        assert_eq!(
            fixture
                .session()
                .get_proposal("legacy")
                .unwrap()
                .accepted_revision,
            Some(2)
        );
        assert_eq!(
            fixture.session().acceptance("legacy", 1).unwrap()["revision"],
            2
        );
        assert!(s
            .propose_with_title(
                "no-region",
                2,
                "fixture-card",
                None,
                None,
                "edit",
                Some("New title".into())
            )
            .unwrap_err()
            .contains("declared template region"));
    }
    #[test]
    fn title_resource_and_region_limits_are_checked() {
        let fixture = Fixture::new();
        let s = fixture.session();
        s.propose_with_title(
            "boundary",
            1,
            "fixture-card",
            None,
            None,
            "edit",
            Some("é".repeat(10_000)),
        )
        .unwrap();
        assert!(s
            .propose_with_title(
                "oversized",
                1,
                "fixture-card",
                None,
                None,
                "edit",
                Some("é".repeat(10_001))
            )
            .is_err());
        let mut pending = s.get_proposal("boundary").unwrap();
        pending.title = Some(" ".repeat(20_001));
        assert!(s.apply(&s.project().unwrap(), &pending).is_err());
        let path = fixture.0.join("project.artificer.json");
        let original = s.project().unwrap();
        drop(s);
        for field in ["current", "history", "region", "font"] {
            let mut p = original.clone();
            match field {
                "current" => p["cards"][0]["title"] = json!(" ".repeat(20_001)),
                "history" => {
                    let mut previous = p["cards"][0].clone();
                    previous["title"] = json!(" ".repeat(20_001));
                    p["history"] = json!([{"cards":[previous],"commandId":"invalid"}]);
                }
                "region" => p["templates"][0]["titleRegion"]["width"] = json!(2000),
                _ => p["templates"][0]["titleFontPx"] = Value::Null,
            }
            fs::write(&path, serde_json::to_vec(&p).unwrap()).unwrap();
            assert!(Session::default()
                .open(fixture.0.to_str().unwrap())
                .is_err());
        }
    }
    #[test]
    fn project_file_limit_remains_unchanged_with_title_metadata() {
        let fixture = Fixture::new();
        let path = fixture.0.join("project.artificer.json");
        let mut p: Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        p["syntheticPadding"] = json!(" ".repeat(5_000_000));
        let bytes = serde_json::to_vec(&p).unwrap();
        fs::write(&path, &bytes).unwrap();
        assert!(Session::default()
            .open(fixture.0.to_str().unwrap())
            .unwrap_err()
            .contains("size limit"));
        assert_eq!(fs::read(&path).unwrap(), bytes);
    }
    #[test]
    fn undo_history_obeys_current_body_byte_limit() {
        for (body, allowed) in [
            (json!(" ".repeat(MAX_BODY_BYTES)), true),
            (json!(" ".repeat(MAX_BODY_BYTES + 1)), false),
            (json!("é".repeat(MAX_BODY_BYTES / 2)), true),
            (json!("é".repeat(MAX_BODY_BYTES / 2 + 1)), false),
            (Value::Null, false),
        ] {
            let fixture = Fixture::new();
            let path = fixture.0.join("project.artificer.json");
            let mut p: Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
            let mut previous = p["cards"][0].clone();
            previous["body"] = body.clone();
            // Check every history entry, not just the next undo target.
            p["history"] = json!([
                {"cards":[previous],"commandId":"older"},
                {"cards":p["cards"],"commandId":"newer"}
            ]);
            let before = serde_json::to_vec(&p).unwrap();
            fs::write(&path, &before).unwrap();
            let mut session = Session::default();
            let opened = session.open(fixture.0.to_str().unwrap());
            if allowed {
                opened.unwrap();
                for (id, revision) in [("undo-newer", 1), ("undo-older", 2)] {
                    session
                        .propose(id, revision, "", None, None, "undo")
                        .unwrap();
                    session
                        .record(id, revision, session.get_proposal(id).unwrap(), pass())
                        .unwrap();
                    session.acceptance(id, revision).unwrap();
                }
                let reopened = fixture.session().project().unwrap();
                assert_eq!(reopened["cards"][0]["body"], body);
                assert_eq!(reopened["revision"], 3);
            } else {
                assert_eq!(opened.unwrap_err(), "Invalid single-card undo history");
                assert!(session.root.is_none());
                assert_eq!(fs::read(&path).unwrap(), before);
                assert!(!fixture.0.join(".artificer").exists());
            }
        }
    }
    #[test]
    fn acceptance_requires_editor_and_undo_advances_revision() {
        let fixture = Fixture::new();
        let mut s = fixture.session();
        s.propose(
            "agent-1",
            1,
            "fixture-card",
            Some("Gain two focus.".into()),
            None,
            "edit",
        )
        .unwrap();
        assert!(s.acceptance("agent-1", 1).is_err());
        s.record("agent-1", 1, s.get_proposal("agent-1").unwrap(), pass())
            .unwrap();
        let changed = s.acceptance("agent-1", 1).unwrap();
        assert_eq!(changed["revision"], 2);
        assert_eq!(s.acceptance("agent-1", 1).unwrap()["revision"], 2);
        s.propose("undo-1", 2, "", None, None, "undo").unwrap();
        s.record("undo-1", 2, s.get_proposal("undo-1").unwrap(), pass())
            .unwrap();
        let restored = s.acceptance("undo-1", 2).unwrap();
        assert_eq!(restored["revision"], 3);
        assert_ne!(restored["cards"][0]["body"], "Gain two focus.");
    }
    #[test]
    fn external_write_invalidates_preview_even_without_revision_bump() {
        let fixture = Fixture::new();
        let mut s = fixture.session();
        s.propose(
            "agent-1",
            1,
            "fixture-card",
            Some("Gain two focus.".into()),
            None,
            "edit",
        )
        .unwrap();
        s.record("agent-1", 1, s.get_proposal("agent-1").unwrap(), pass())
            .unwrap();
        let mut p = s.project().unwrap();
        p["label"] = json!("External writer");
        fs::write(
            fixture.0.join("project.artificer.json"),
            serde_json::to_vec(&p).unwrap(),
        )
        .unwrap();
        assert!(s
            .acceptance("agent-1", 1)
            .unwrap_err()
            .contains("Revision conflict"));
        assert_eq!(s.project().unwrap()["revision"], 1);
    }
    #[test]
    fn stale_revision_bad_asset_and_transaction_lock_are_rejected() {
        let fixture = Fixture::new();
        let s = fixture.session();
        assert!(s
            .propose("x", 0, "fixture-card", None, None, "edit")
            .is_err());
        assert!(s.asset("../../outside").is_err());
        let lock = fixture.0.join(".artificer/transaction.lock");
        let _held = s.root().unwrap().lock().unwrap();
        assert!(s
            .propose("x", 1, "fixture-card", None, None, "edit")
            .is_err());
        assert!(lock.exists());
    }
    #[cfg(unix)]
    #[test]
    fn asset_symlink_and_traversal_never_read_outside_root() {
        let fixture = Fixture::new();
        let s = fixture.session();
        let outside = Fixture::new();
        fs::remove_file(fixture.0.join("assets/grid.svg")).unwrap();
        std::os::unix::fs::symlink(
            outside.0.join("assets/grid.svg"),
            fixture.0.join("assets/grid.svg"),
        )
        .unwrap();
        assert!(s.asset("grid").is_err());
        assert!(s.root().unwrap().bytes("assets/../../outside").is_err());
    }
    #[test]
    fn mcp_cannot_commit_or_change_scope() {
        let fixture = Fixture::new();
        let mut s = fixture.session();
        s.propose(
            "agent-1",
            1,
            "fixture-card",
            Some("Gain two focus.".into()),
            None,
            "edit",
        )
        .unwrap();
        let response=crate::mcp::request(&mut s,&json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"commit_proposal","arguments":{"id":"agent-1"}}})).unwrap();
        assert_eq!(response["result"]["structuredContent"]["committed"], false);
        assert_eq!(s.project().unwrap()["revision"], 1);
        let response=crate::mcp::request(&mut s,&json!({"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_project","arguments":{"path":"/"}}})).unwrap();
        assert_eq!(response["result"]["isError"], true);
    }
}

#[cfg(test)]
mod adversarial_tests {
    use super::*;
    fn setup() -> (PathBuf, Session) {
        let root = std::env::temp_dir().join(format!("artificer-adversarial-{}", nonce()));
        fs::create_dir_all(root.join("assets")).unwrap();
        let src = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/neutral-project");
        fs::copy(
            src.join("project.artificer.json"),
            root.join("project.artificer.json"),
        )
        .unwrap();
        for name in ["grid.svg", "rings.svg"] {
            fs::copy(
                src.join("assets").join(name),
                root.join("assets").join(name),
            )
            .unwrap();
        }
        let mut s = Session::default();
        s.open(root.to_str().unwrap()).unwrap();
        (root, s)
    }
    fn pass() -> Value {
        json!({"status":"pass","diagnostics":[],"environment":"adversarial test seam"})
    }
    #[test]
    fn changed_proposal_cannot_use_prior_render_report() {
        let (root, mut s) = setup();
        let old = s
            .propose(
                "x",
                1,
                "fixture-card",
                Some("Gain two focus.".into()),
                None,
                "edit",
            )
            .unwrap();
        let mut replacement = old.clone();
        replacement.body = Some("Unmeasured overflow ".repeat(500));
        fs::write(
            root.join(".artificer/requests/x.json"),
            serde_json::to_vec(&replacement).unwrap(),
        )
        .unwrap();
        assert!(s.record("x", 1, old, pass()).is_err());
        assert!(s.acceptance("x", 1).is_err());
        assert_eq!(s.project().unwrap()["revision"], 1);
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn accepted_retry_and_interrupted_queue_reconcile_from_project_journal() {
        let (root, mut s) = setup();
        let pending = s
            .propose(
                "x",
                1,
                "fixture-card",
                Some("Gain two focus.".into()),
                None,
                "edit",
            )
            .unwrap();
        s.record("x", 1, pending.clone(), pass()).unwrap();
        s.acceptance("x", 1).unwrap();
        fs::write(
            root.join(".artificer/requests/x.json"),
            serde_json::to_vec(&pending).unwrap(),
        )
        .unwrap();
        let result = s
            .propose(
                "x",
                1,
                "fixture-card",
                Some("Gain two focus.".into()),
                None,
                "edit",
            )
            .unwrap();
        assert_eq!(result.status, "accepted");
        assert_eq!(result.accepted_revision, Some(2));
        let mut changed = pending.clone();
        changed.body = Some("Tampered after acceptance".into());
        fs::write(
            root.join(".artificer/requests/x.json"),
            serde_json::to_vec(&changed).unwrap(),
        )
        .unwrap();
        assert!(s.get_proposal("x").is_err());
        fs::write(
            root.join(".artificer/requests/x.json"),
            serde_json::to_vec(&pending).unwrap(),
        )
        .unwrap();
        assert!(s.list().unwrap().iter().all(|p| p.status == "accepted"));
        assert!(s
            .propose(
                "x",
                1,
                "fixture-card",
                Some("Different payload".into()),
                None,
                "edit"
            )
            .is_err());
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn extra_card_rejected_before_any_measurement() {
        let (root, s) = setup();
        let mut p = s.project().unwrap();
        let mut card = p["cards"][0].clone();
        card["id"] = json!("second");
        p["cards"].as_array_mut().unwrap().push(card);
        fs::write(
            root.join("project.artificer.json"),
            serde_json::to_vec(&p).unwrap(),
        )
        .unwrap();
        assert!(s.project().unwrap_err().contains("exactly one card"));
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn persistent_lock_never_bypasses_an_active_writer() {
        let (root, s) = setup();
        let path = root.join(".artificer/transaction.lock");
        let held = s.root().unwrap().lock().unwrap();
        assert!(s.root().unwrap().recover_lock().is_err());
        let second = crate::scoped_fs::Root::open(root.to_str().unwrap()).unwrap();
        assert!(second.lock().is_err());
        drop(held);
        assert!(path.exists());
        second.recover_lock().unwrap();
        let next = second.lock().unwrap();
        assert!(s.root().unwrap().recover_lock().is_err());
        assert!(path.exists());
        drop(next);
        s.root().unwrap().recover_lock().unwrap();
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn malformed_rpc_does_not_dispatch_and_constraints_are_objects() {
        let (root, mut s) = setup();
        let invalid=crate::mcp::request(&mut s,&json!({"jsonrpc":"wrong","id":1,"method":"tools/call","params":{"name":"get_project"}})).unwrap();
        assert_eq!(invalid["error"]["code"], -32600);
        let result=crate::mcp::request(&mut s,&json!({"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_constraints","arguments":{}}})).unwrap();
        assert!(result["result"]["structuredContent"].is_object());
        fs::remove_dir_all(root).unwrap();
    }
    #[cfg(unix)]
    #[test]
    fn swapped_directory_symlink_never_redirects_writes() {
        let (root, s) = setup();
        let outside = std::env::temp_dir().join(format!("artificer-outside-{}", nonce()));
        fs::create_dir(&outside).unwrap();
        let requests = root.join(".artificer/requests");
        fs::rename(&requests, root.join(".artificer/original-requests")).unwrap();
        std::os::unix::fs::symlink(&outside, &requests).unwrap();
        assert!(s
            .propose("x", 1, "fixture-card", None, None, "edit")
            .is_err());
        assert_eq!(fs::read_dir(&outside).unwrap().count(), 0);
        fs::remove_dir_all(root).unwrap();
        fs::remove_dir_all(outside).unwrap();
    }
}
