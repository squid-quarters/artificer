//! POSIX directory capabilities: every lookup is descriptor-relative and no-follow.
//! The first slice is verified on macOS; Windows filesystem support is not implemented.
use std::{
    ffi::{CStr, CString},
    fs::File,
    io::{Read, Write},
    os::{
        fd::{AsRawFd, FromRawFd, IntoRawFd},
        unix::fs::{MetadataExt, OpenOptionsExt},
    },
    path::{Component, Path},
};
type Result<T> = std::result::Result<T, String>;
fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn c(s: &str) -> Result<CString> {
    CString::new(s).map_err(err)
}
fn open_at(dir: &File, name: &CStr, flags: i32) -> Result<File> {
    let fd = unsafe {
        libc::openat(
            dir.as_raw_fd(),
            name.as_ptr(),
            flags | libc::O_NOFOLLOW | libc::O_CLOEXEC,
            0o600,
        )
    };
    if fd < 0 {
        Err(err(std::io::Error::last_os_error()))
    } else {
        Ok(unsafe { File::from_raw_fd(fd) })
    }
}
pub struct Root {
    file: File,
}
pub struct Lock {
    // Keep the persistent inode open and exclusively flocked until this guard drops.
    // Never unlink it: another process may be waiting on the same inode.
    _file: File,
}
impl Root {
    pub fn open(path: &str) -> Result<Self> {
        let display = std::fs::canonicalize(path).map_err(err)?;
        let before = std::fs::metadata(&display).map_err(err)?;
        let file = std::fs::OpenOptions::new()
            .read(true)
            .custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW | libc::O_CLOEXEC)
            .open(&display)
            .map_err(err)?;
        let actual = file.metadata().map_err(err)?;
        if before.dev() != actual.dev() || before.ino() != actual.ino() {
            return Err("Root changed while opening".into());
        }
        Ok(Self { file })
    }
    fn components(relative: &str) -> Result<Vec<String>> {
        let path = Path::new(relative);
        if path.is_absolute() {
            return Err("Path outside project scope".into());
        }
        let mut parts = vec![];
        for part in path.components() {
            match part {
                Component::Normal(n) => {
                    parts.push(n.to_str().ok_or("Invalid path encoding")?.to_string())
                }
                _ => return Err("Path outside project scope".into()),
            }
        }
        if parts.is_empty() {
            return Err("Empty scoped path".into());
        }
        Ok(parts)
    }
    fn parent(&self, relative: &str) -> Result<(File, CString)> {
        let mut parts = Self::components(relative)?;
        let name = c(&parts.pop().unwrap())?;
        let mut dir = self.file.try_clone().map_err(err)?;
        for part in parts {
            dir = open_at(&dir, &c(&part)?, libc::O_RDONLY | libc::O_DIRECTORY)?;
        }
        Ok((dir, name))
    }
    pub fn ensure_directory(&self, relative: &str) -> Result<()> {
        let mut dir = self.file.try_clone().map_err(err)?;
        for part in Self::components(relative)? {
            let name = c(&part)?;
            let result = unsafe { libc::mkdirat(dir.as_raw_fd(), name.as_ptr(), 0o700) };
            if result < 0
                && std::io::Error::last_os_error().kind() != std::io::ErrorKind::AlreadyExists
            {
                return Err(err(std::io::Error::last_os_error()));
            }
            dir = open_at(&dir, &name, libc::O_RDONLY | libc::O_DIRECTORY)?;
        }
        Ok(())
    }
    pub fn bytes(&self, relative: &str) -> Result<Vec<u8>> {
        let (dir, name) = self.parent(relative)?;
        let file = open_at(&dir, &name, libc::O_RDONLY | libc::O_NONBLOCK)?;
        let metadata = file.metadata().map_err(err)?;
        if !metadata.is_file() || metadata.len() > 5_000_000 {
            return Err("Scoped file type/size limit".into());
        }
        let mut bytes = vec![];
        file.take(5_000_001).read_to_end(&mut bytes).map_err(err)?;
        if bytes.len() > 5_000_000 {
            return Err("Scoped file size limit".into());
        }
        Ok(bytes)
    }
    pub fn exists(&self, relative: &str) -> Result<bool> {
        let (dir, name) = self.parent(relative)?;
        let mut metadata: libc::stat = unsafe { std::mem::zeroed() };
        if unsafe {
            libc::fstatat(
                dir.as_raw_fd(),
                name.as_ptr(),
                &mut metadata,
                libc::AT_SYMLINK_NOFOLLOW,
            )
        } == 0
        {
            if metadata.st_mode & libc::S_IFMT == libc::S_IFLNK {
                return Err("Symlink denied".into());
            }
            Ok(true)
        } else {
            let e = std::io::Error::last_os_error();
            if e.kind() == std::io::ErrorKind::NotFound {
                Ok(false)
            } else {
                Err(err(e))
            }
        }
    }
    pub fn names(&self, relative: &str) -> Result<Vec<String>> {
        let mut dir = self.file.try_clone().map_err(err)?;
        for part in Self::components(relative)? {
            dir = open_at(&dir, &c(&part)?, libc::O_RDONLY | libc::O_DIRECTORY)?;
        }
        let stream = unsafe { libc::fdopendir(dir.into_raw_fd()) };
        if stream.is_null() {
            return Err(err(std::io::Error::last_os_error()));
        }
        let mut names = vec![];
        loop {
            let entry = unsafe { libc::readdir(stream) };
            if entry.is_null() {
                break;
            }
            let name = unsafe { CStr::from_ptr((*entry).d_name.as_ptr()) }
                .to_string_lossy()
                .to_string();
            if name != "." && name != ".." {
                names.push(name);
            }
        }
        unsafe {
            libc::closedir(stream);
        }
        Ok(names)
    }
    pub fn lock(&self) -> Result<Lock> {
        let (parent, name) = self.parent(".artificer/transaction.lock")?;
        let mut file = open_at(
            &parent,
            &name,
            libc::O_RDWR | libc::O_CREAT | libc::O_NONBLOCK,
        )?;
        if !file.metadata().map_err(err)?.is_file() {
            return Err("Invalid transaction lock type".into());
        }
        if unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } < 0 {
            return Err("Project is busy; active locks are never bypassed".into());
        }
        file.set_len(0).map_err(err)?;
        write!(file, "{}", std::process::id()).map_err(err)?;
        file.sync_all().map_err(err)?;
        Ok(Lock { _file: file })
    }
    pub fn recover_lock(&self) -> Result<()> {
        // Crash releases flock automatically. This explicit editor check only
        // succeeds when the persistent lock is free; it never removes a file.
        let _guard = self.lock()?;
        Ok(())
    }
    pub fn atomic(
        &self,
        relative: &str,
        bytes: &[u8],
        check: impl FnOnce() -> Result<()>,
    ) -> Result<()> {
        if bytes.len() > 5_000_000 {
            return Err("Scoped file size limit".into());
        }
        let (parent, name) = self.parent(relative)?;
        let temp = c(&format!(".write-{}", crate::project::nonce()))?;
        let mut file = open_at(
            &parent,
            &temp,
            libc::O_WRONLY | libc::O_CREAT | libc::O_EXCL,
        )?;
        let result = (|| {
            file.write_all(bytes).map_err(err)?;
            file.sync_all().map_err(err)?;
            check()?;
            if unsafe {
                libc::renameat(
                    parent.as_raw_fd(),
                    temp.as_ptr(),
                    parent.as_raw_fd(),
                    name.as_ptr(),
                )
            } < 0
            {
                return Err(err(std::io::Error::last_os_error()));
            }
            parent.sync_all().map_err(err)
        })();
        if result.is_err() {
            unsafe {
                libc::unlinkat(parent.as_raw_fd(), temp.as_ptr(), 0);
            }
        }
        result
    }
}
