# LinuxTypecheck

A throwaway package that type-checks and runs the tests of the app's Apple-free logic on Linux
(no Xcode here): view models, the processing pipeline, the grounded answerer, timeline grouping,
search. Device-only collaborators are stubbed in `Sources/AppLogic/Stubs.swift` with the same API.

```
./sync.sh && /opt/swift/usr/bin/swift test
```

It proves the app logic compiles against DoOnceCore and behaves; it does not replace an Xcode build.
