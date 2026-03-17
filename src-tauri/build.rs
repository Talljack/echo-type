fn main() {
    println!("cargo:rerun-if-changed=icons");
    println!("cargo:rerun-if-changed=resources");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    tauri_build::build()
}
