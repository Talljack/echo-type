// Keep this list aligned with release-desktop.yml's actual build targets.
// The macOS job builds ARM only: never advertise that binary to Intel Macs.
export function selectUpdaterAssets(assets, version) {
  const names = {
    'darwin-aarch64': 'EchoType.app.tar.gz',
    'linux-x86_64': `EchoType_${version}_amd64.AppImage`,
    'windows-x86_64': `EchoType_${version}_x64-setup.exe`,
  };
  return Object.fromEntries(
    Object.entries(names).map(([platform, name]) => {
      const asset = assets.find((entry) => entry.name === name);
      const sigAsset = assets.find((entry) => entry.name === `${name}.sig`);
      if (!asset) throw new Error(`Missing updater asset for ${platform}: ${name}`);
      if (!sigAsset) throw new Error(`Missing updater signature for ${platform}: ${name}.sig`);
      return [platform, { asset, sigAsset }];
    }),
  );
}
