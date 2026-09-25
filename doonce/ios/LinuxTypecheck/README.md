# LinuxTypecheck

A throwaway package that type-checks and runs the tests of the app's Apple-free logic on Linux
(no Xcode here): the processing pipeline (resumable stages over a real `FileStore`), the Do-mode
and search view models, the grounded answerer, timeline grouping. Device-only collaborators
(camera files, key frames, clip export, Speech, ActivityKit, the widget store, `AppState`) are
stubbed in `Sources/AppLogic/Stubs.swift` with the same API the linked files use.

```
./sync.sh && /opt/swift/usr/bin/swift test      # 29 tests
```

`sync.sh` symlinks 9 app sources and copies 5 test files (`import DoOnce` → `import AppLogic`).
`PaywallGateTests` is left out: it drives the real `AppState`, which needs the app target.

It proves the app logic compiles against DoOnceCore and behaves; it does not replace an Xcode build.
