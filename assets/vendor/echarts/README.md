# Apache ECharts 6.1.0

The one ECharts build in this repository, pinned at **6.1.0**. `DESIGN.md` (section 8) records the same version, so linkedin-content-manager can pin it too.

| File | What it is |
| --- | --- |
| `echarts.min.js` | `package/dist/echarts.min.js` from the official npm tarball, unchanged |
| `LICENSE` | Apache License 2.0, with the notices for the code ECharts embeds, from the same tarball |
| `NOTICE` | The Apache NOTICE file, from the same tarball |

## Provenance

- Source: https://registry.npmjs.org/echarts/-/echarts-6.1.0.tgz, fetched with curl, not npm.
- Tarball integrity, as the registry publishes it: `sha512-q0yaFPggC9FUdsWH4blavRWFmxdrIodbkoKNAjJudAI6CA9gNPxHtV2RcZNEepZVlk4yvBYkOkbk6HIVpIyHZA==` (SHA-1 `ae0f68590f5ebbd728d900907c27acde7c5456d1`). The download matched both.
- Tarball SHA-256: `681aff88cc1038c3fa941a3a53d1b177a52250b05335efc607d6105ae13be481`

## Checksum

```
b66b25aeb4df84e33199dc21694014d336d222cbd9deb0e5a7c14bd6aa0d0fd0  echarts.min.js
```

`tests/unit/test_vendor.py` checks this checksum and the version the file declares, so an edit to the file or a second copy fails the tests.

## Upgrading

1. Fetch the new tarball from the registry with curl, and check it against the registry's `dist.integrity`.
2. Replace the three files above with the tarball's `dist/echarts.min.js`, `LICENSE` and `NOTICE`.
3. Update the version and the checksums here, the version in `DESIGN.md`, and the checksum in `tests/unit/test_vendor.py`.
