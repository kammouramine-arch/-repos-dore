#!/usr/bin/env bash
# DoOnce iOS verification on macOS: generate the Xcode project, build the real app for the
# simulator, run the XCTest suites, capture native screenshots. Used by
# .github/workflows/doonce-ios.yml and runnable locally on any Mac with Xcode 26:
#
#   doonce/ios/ci.sh all            # everything below, in order
#   doonce/ios/ci.sh generate       # xcodegen + project inspection
#   doonce/ios/ci.sh build          # xcodebuild build-for-testing (unsigned, simulator)
#   doonce/ios/ci.sh install        # install + launch the app in the simulator, one raw screenshot
#   doonce/ios/ci.sh unit           # DoOnceTests
#   doonce/ios/ci.sh ui light|dark  # DoOnceUITests (golden path + screenshot walk) in that appearance
#   doonce/ios/ci.sh summary        # test totals from the result bundles → stdout and $GITHUB_STEP_SUMMARY
#
# No signing: CODE_SIGNING_ALLOWED=NO. No secrets: the app runs in demo configuration.
set -euo pipefail

IOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$IOS_DIR/DoOnce"
OUT="$IOS_DIR/build"
DERIVED="$OUT/DerivedData"
PROJECT="$APP_DIR/DoOnce.xcodeproj"
SCHEME="DoOnce"
BUNDLE_ID="app.doonce.ios"
mkdir -p "$OUT"

log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
summary() { echo "$*"; if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then echo "$*" >> "$GITHUB_STEP_SUMMARY"; fi; }

select_xcode() {
  # Newest non-beta Xcode on the machine (the runner image ships several).
  if [ -n "${DEVELOPER_DIR:-}" ]; then return; fi
  local newest
  newest=$(ls -d /Applications/Xcode*.app 2>/dev/null | grep -vi beta | sort -V | tail -n 1 || true)
  if [ -n "$newest" ]; then export DEVELOPER_DIR="$newest/Contents/Developer"; fi
}

show_toolchain() {
  select_xcode
  log "Toolchain"
  echo "DEVELOPER_DIR=${DEVELOPER_DIR:-$(xcode-select -p)}"
  xcodebuild -version
  xcodebuild -showsdks | grep -i "iphonesimulator" || true
  sw_vers
}

pick_simulator() {
  # The newest available iPhone runtime, preferring a Pro model; prints "<udid>|<name>|<runtime>".
  xcrun simctl list devices available -j | python3 -c '
import json, re, sys
data = json.load(sys.stdin)["devices"]
best = None
for runtime, devices in data.items():
    if "iOS" not in runtime: continue
    m = re.search(r"iOS-(\d+)-(\d+)", runtime)
    ver = (int(m.group(1)), int(m.group(2))) if m else (0, 0)
    for d in devices:
        if not d.get("isAvailable") or "iPhone" not in d["name"]: continue
        pro = 1 if "Pro" in d["name"] and "Max" not in d["name"] else 0
        gen = re.search(r"iPhone (\d+)", d["name"]); gen = int(gen.group(1)) if gen else 0
        key = (ver, gen, pro)
        if best is None or key > best[0]: best = (key, d["udid"], d["name"], runtime)
if best is None: sys.exit("no available iPhone simulator")
print(f"{best[1]}|{best[2]}|{best[3]}")
'
}

simulator() {
  if [ -f "$OUT/simulator.txt" ]; then cat "$OUT/simulator.txt"; return; fi
  local s; s=$(pick_simulator); echo "$s" > "$OUT/simulator.txt"; echo "$s"
}
sim_udid() { simulator | cut -d'|' -f1; }
sim_name() { simulator | cut -d'|' -f2; }
sim_runtime() { simulator | cut -d'|' -f3; }

do_generate() {
  show_toolchain
  log "XcodeGen"
  if ! command -v xcodegen >/dev/null; then brew install xcodegen; fi
  xcodegen --version
  (cd "$APP_DIR" && xcodegen generate)
  log "Generated project"
  xcodebuild -list -project "$PROJECT"
  local pbx="$PROJECT/project.pbxproj"
  for needle in "DoOnce" "DoOnceWidgets" "DoOnceTests" "DoOnceUITests" "DoOnceCore" "Assets.xcassets" "DoOnce.entitlements" "DoOnceWidgets.entitlements" "Localizable.xcstrings"; do
    if grep -q "$needle" "$pbx"; then echo "  ✓ $needle"; else echo "  ✗ $needle missing from project.pbxproj"; exit 1; fi
  done
  summary "- Xcode project generation: PASS ($(xcodegen --version), $(xcodebuild -version | tr '\n' ' '))"
}

do_build() {
  select_xcode
  local udid; udid=$(sim_udid)
  log "Simulator: $(sim_name) ($(sim_runtime)) $udid"
  log "xcodebuild build-for-testing"
  local status=0
  xcodebuild build-for-testing \
    -project "$PROJECT" -scheme "$SCHEME" -configuration Debug \
    -destination "platform=iOS Simulator,id=$udid" \
    -derivedDataPath "$DERIVED" \
    CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
    COMPILER_INDEX_STORE_ENABLE=NO \
    > "$OUT/build.log" 2>&1 || status=$?
  grep -E "^(=== |\*\* |Build |Ld )" "$OUT/build.log" || true
  log "Diagnostics (unique)"
  grep -E ": (error|warning):" "$OUT/build.log" | sed -E 's#^.*/doonce/ios/#doonce/ios/#' | sort -u | tee "$OUT/diagnostics.txt" || true
  echo "errors: $(grep -cE ': error:' "$OUT/diagnostics.txt" || true), warnings: $(grep -cE ': warning:' "$OUT/diagnostics.txt" || true)"
  if [ "$status" -ne 0 ]; then
    grep -E "(error:|\*\* BUILD FAILED)" "$OUT/build.log" | sort -u | head -n 80
    summary "- iOS build: FAIL (see build.log artifact)"
    exit "$status"
  fi
  summary "- iOS build (build-for-testing, Debug, unsigned, $(sim_name) / $(sim_runtime)): PASS"
}

do_install() {
  select_xcode
  local udid; udid=$(sim_udid)
  local app="$DERIVED/Build/Products/Debug-iphonesimulator/DoOnce.app"
  log "Boot $(sim_name)"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b
  log "Install and launch $app"
  xcrun simctl install "$udid" "$app"
  # Demo configuration, sample content, skip onboarding so the launch shows the shell.
  SIMCTL_CHILD_DOONCE_SAMPLE_CONTENT=1 xcrun simctl launch "$udid" "$BUNDLE_ID" -onboarded 1 -firstMemorySaved 1 -launchCount 1
  sleep 6
  mkdir -p "$OUT/screenshots"
  xcrun simctl io "$udid" screenshot "$OUT/screenshots/00-launched-memory.png"
  xcrun simctl terminate "$udid" "$BUNDLE_ID" || true
  summary "- Native app launch in the simulator ($(sim_name), $(sim_runtime)): PASS"
}

do_unit() {
  select_xcode
  local udid; udid=$(sim_udid)
  log "DoOnceTests"
  rm -rf "$OUT/UnitTests.xcresult"
  local status=0
  xcodebuild test-without-building \
    -project "$PROJECT" -scheme "$SCHEME" \
    -destination "platform=iOS Simulator,id=$udid" \
    -derivedDataPath "$DERIVED" \
    -only-testing:DoOnceTests \
    -resultBundlePath "$OUT/UnitTests.xcresult" \
    > "$OUT/unit.log" 2>&1 || status=$?
  grep -E "(Test Case .* (passed|failed)|Test Suite .* (passed|failed)|Executed|error:|\*\* TEST)" "$OUT/unit.log" | sort -u | head -n 120 || true
  return "$status"
}

do_ui() {
  select_xcode
  local appearance="${1:-light}"
  local udid; udid=$(sim_udid)
  local app="$DERIVED/Build/Products/Debug-iphonesimulator/DoOnce.app"
  log "DoOnceUITests ($appearance)"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b
  xcrun simctl ui "$udid" appearance "$appearance"
  # Reinstall fresh: the light and dark passes share one simulator, and the app persists its
  # store on disk (Application Support, not wiped between xcodebuild invocations). Without this,
  # sample-content seeding and progress from an earlier pass (light's own golden-path run, or the
  # `install` step's launch) leak into the next one — e.g. the golden-path memory already
  # completed and its progress cleared, so "Continue" no longer exists for the next pass to find.
  xcrun simctl terminate "$udid" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl uninstall "$udid" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl install "$udid" "$app"
  # The camera surfaces need the permission granted up front; the simulator has no camera, so the
  # views show their real "camera unavailable" state instead of a permission sheet.
  for p in camera microphone; do xcrun simctl privacy "$udid" grant "$p" "$BUNDLE_ID" 2>/dev/null || true; done
  rm -rf "$OUT/UITests-$appearance.xcresult"
  local status=0
  TEST_RUNNER_DOONCE_APPEARANCE="$appearance" xcodebuild test-without-building \
    -project "$PROJECT" -scheme "$SCHEME" \
    -destination "platform=iOS Simulator,id=$udid" \
    -derivedDataPath "$DERIVED" \
    -only-testing:DoOnceUITests \
    -resultBundlePath "$OUT/UITests-$appearance.xcresult" \
    > "$OUT/ui-$appearance.log" 2>&1 || status=$?
  grep -E "(Test Case .* (passed|failed)|Test Suite .* (passed|failed)|Executed|error:|\*\* TEST)" "$OUT/ui-$appearance.log" | sort -u | head -n 120 || true
  export_screenshots "$OUT/UITests-$appearance.xcresult" "$OUT/screenshots/$appearance"
  return "$status"
}

export_screenshots() {
  local bundle="$1" dest="$2"
  [ -d "$bundle" ] || return 0
  mkdir -p "$dest"
  xcrun xcresulttool export attachments --path "$bundle" --output-path "$dest" >/dev/null 2>&1 || return 0
  python3 - "$dest" <<'PY'
import json, os, sys
dest = sys.argv[1]
manifest = os.path.join(dest, "manifest.json")
if not os.path.exists(manifest): sys.exit(0)
import re
seen = {}
for entry in json.load(open(manifest)):
    for a in entry.get("attachments", []):
        src = os.path.join(dest, a["exportedFileName"])
        if not os.path.exists(src): continue
        ext = os.path.splitext(a["exportedFileName"])[1].lower()
        if ext not in (".png", ".jpg", ".jpeg", ".heic"):
            os.remove(src)  # XCTest's failure diagnostics (UI hierarchies, debug descriptions)
            continue
        name = a.get("suggestedHumanReadableName") or a["exportedFileName"]
        name = re.sub(r"_\d+_[0-9A-Fa-f-]{36}", "", os.path.splitext(name)[0])
        name = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-") or "screenshot"
        n = seen.get(name, 0); seen[name] = n + 1
        final = f"{name}{'' if n == 0 else f'-{n}'}{ext}"
        os.replace(src, os.path.join(dest, final))
os.remove(manifest)
PY
  ls "$dest" | sed 's/^/  /'
}

do_summary() {
  select_xcode
  summary "### iOS XCTest"
  for bundle in UnitTests UITests-light UITests-dark; do
    local path="$OUT/$bundle.xcresult"
    [ -d "$path" ] || { summary "- $bundle: not run"; continue; }
    xcrun xcresulttool get test-results summary --path "$path" > "$OUT/$bundle.json" 2>/dev/null || { summary "- $bundle: no summary"; continue; }
    python3 - "$bundle" "$OUT/$bundle.json" <<'PY' | while read -r line; do summary "$line"; done
import json, sys
name, path = sys.argv[1], sys.argv[2]
s = json.load(open(path))
total, passed, failed, skipped = s.get("totalTestCount", 0), s.get("passedTests", 0), s.get("failedTests", 0), s.get("skippedTests", 0)
print(f"- {name}: {passed} passed, {failed} failed, {skipped} skipped (total {total}) → {'PASS' if failed == 0 and total > 0 else 'FAIL'}")
for f in s.get("testFailures", [])[:20]:
    print(f"  - ✗ {f.get('testName')}: {f.get('failureText','').splitlines()[0] if f.get('failureText') else ''}")
PY
  done
}

case "${1:-all}" in
  generate) do_generate ;;
  build) do_build ;;
  install) do_install ;;
  unit) do_unit ;;
  ui) do_ui "${2:-light}" ;;
  summary) do_summary ;;
  all) do_generate; do_build; do_install; do_unit; do_ui light; do_ui dark; do_summary ;;
  *) echo "usage: ci.sh generate|build|install|unit|ui light|dark|summary|all"; exit 2 ;;
esac
