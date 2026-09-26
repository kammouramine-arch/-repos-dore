#!/usr/bin/env python3
"""Minimal App Store Connect API client for the DoOnce TestFlight pipeline.

Used only by .github/workflows/doonce-testflight.yml, on the macOS runner, authenticated with the
App Store Connect API key (never an Apple ID password or interactive 2FA). Standard library only,
plus `openssl` (present on every macOS runner) for ES256 JWT signing, so nothing needs to be
installed. The private key is read from a path the workflow writes to a runner-local temp file and
deletes afterward; this script never logs its contents and never writes it anywhere itself.

Subcommands (each prints one JSON object to stdout; a non-zero exit means failure, with the reason
on stderr):

  find-or-create-app --bundle-id ID --name NAME --sku SKU [--locale en-US]
      Looks up the app by bundle id; creates it (platform iOS) if it does not exist yet. Creating
      an app additionally requires the bundle id to already be registered to the team (Apple
      Developer "Identifiers"); a real signed archive/export registers it automatically the first
      time, so this is meant to run *after* at least one successful export in the same pipeline.

  latest-build --app-id ID --version SHORT --build BUILD
      Finds the build matching CFBundleShortVersionString + CFBundleVersion. Prints {"found":
      false} if Apple has not registered the upload yet (can take a few minutes after upload).

  wait-build --app-id ID --version SHORT --build BUILD [--timeout-seconds 1800] [--interval-seconds 30]
      Polls latest-build until its processingState leaves PROCESSING. Exits 0 only for VALID;
      exits 1 for INVALID/FAILED (printing Apple's own messages if present) or on timeout.

  ensure-internal-group --app-id ID --group-name NAME
      Creates the named internal beta group if it does not exist, and adds every current App Store
      Connect user on the team (there is no API concept of "the Apple ID that owns the account" to
      target more narrowly than that) as an internal tester of it. Internal testing needs no Apple
      review. Prints {"groupId": "...", "created": true/false, "testersAdded": N}.

  attach-build --group-id GROUP --build-id BUILD
      Attaches a processed build to a beta group so its testers can install it.
"""
from __future__ import annotations

import argparse
import base64
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from typing import Any

API_ROOT = "https://api.appstoreconnect.apple.com/v1"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def der_ecdsa_to_raw(der: bytes, part_len: int = 32) -> bytes:
    """ECDSA-P256 signatures from `openssl dgst -sign` are ASN.1 DER (SEQUENCE of two INTEGERs);
    JWS (JWT) ES256 needs the raw R||S, each left-padded/truncated to 32 bytes."""
    if der[0] != 0x30:
        raise ValueError("not a DER SEQUENCE")
    idx = 2 if der[1] & 0x80 == 0 else 2 + (der[1] & 0x7F)  # skip short/long-form length
    def read_int(i: int) -> tuple[bytes, int]:
        assert der[i] == 0x02, "expected INTEGER"
        length = der[i + 1]
        start = i + 2
        value = der[start:start + length]
        value = value.lstrip(b"\x00") or b"\x00"
        return value, start + length
    r, idx = read_int(idx)
    s, idx = read_int(idx)
    return r.rjust(part_len, b"\x00") + s.rjust(part_len, b"\x00")


def make_jwt(key_id: str, issuer_id: str, key_path: str) -> str:
    header = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    now = int(time.time())
    payload = {"iss": issuer_id, "iat": now, "exp": now + 1190, "aud": "appstoreconnect-v1"}
    signing_input = f"{b64url(json.dumps(header, separators=(',', ':')).encode())}." \
                    f"{b64url(json.dumps(payload, separators=(',', ':')).encode())}"
    der_sig = subprocess.run(
        ["openssl", "dgst", "-sha256", "-sign", key_path],
        input=signing_input.encode(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True,
    ).stdout
    return f"{signing_input}.{b64url(der_ecdsa_to_raw(der_sig))}"


def call(token: str, method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    url = path if path.startswith("http") else f"{API_ROOT}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        print(f"App Store Connect API error {e.code} on {method} {path}:\n{detail}", file=sys.stderr)
        raise


def cmd_find_or_create_app(token: str, args: argparse.Namespace) -> dict[str, Any]:
    found = call(token, "GET", f"/apps?filter[bundleId]={args.bundle_id}")
    if found.get("data"):
        return {"id": found["data"][0]["id"], "created": False}
    created = call(token, "POST", "/apps", {
        "data": {
            "type": "apps",
            "attributes": {
                "bundleId": args.bundle_id,
                "name": args.name,
                "sku": args.sku,
                "primaryLocale": args.locale,
            },
        }
    })
    return {"id": created["data"]["id"], "created": True}


def cmd_latest_build(token: str, args: argparse.Namespace) -> dict[str, Any]:
    q = (f"/builds?filter[app]={args.app_id}&filter[version]={args.build}"
         f"&filter[preReleaseVersion.version]={args.version}&sort=-uploadedDate&limit=1")
    result = call(token, "GET", q)
    if not result.get("data"):
        return {"found": False}
    b = result["data"][0]
    return {"found": True, "id": b["id"], "processingState": b["attributes"]["processingState"]}


def cmd_wait_build(token: str, args: argparse.Namespace) -> dict[str, Any]:
    deadline = time.time() + args.timeout_seconds
    last: dict[str, Any] = {"found": False}
    while time.time() < deadline:
        last = cmd_latest_build(token, args)
        if last.get("found") and last["processingState"] != "PROCESSING":
            break
        print(f"  … processingState={last.get('processingState', 'not uploaded yet')}, waiting {args.interval_seconds}s", file=sys.stderr)
        time.sleep(args.interval_seconds)
    if not last.get("found"):
        print("Timed out waiting for Apple to register the uploaded build.", file=sys.stderr)
        sys.exit(1)
    if last["processingState"] != "VALID":
        print(f"Build finished processing as {last['processingState']}, not VALID.", file=sys.stderr)
        sys.exit(1)
    return last


def cmd_ensure_internal_group(token: str, args: argparse.Namespace) -> dict[str, Any]:
    groups = call(token, "GET", f"/apps/{args.app_id}/betaGroups?filter[isInternalGroup]=true&filter[name]={args.group_name}")
    if groups.get("data"):
        group_id = groups["data"][0]["id"]
        created = False
    else:
        made = call(token, "POST", "/betaGroups", {
            "data": {
                "type": "betaGroups",
                "attributes": {"name": args.group_name, "isInternalGroup": True, "hasAccessToAllBuilds": True},
                "relationships": {"app": {"data": {"type": "apps", "id": args.app_id}}},
            }
        })
        group_id = made["data"]["id"]
        created = True

    users = call(token, "GET", "/users?limit=200")
    added = 0
    for user in users.get("data", []):
        email = user["attributes"].get("email")
        if not email:
            continue
        try:
            call(token, "POST", "/betaTesters", {
                "data": {
                    "type": "betaTesters",
                    "attributes": {"email": email, "firstName": user["attributes"].get("firstName", ""), "lastName": user["attributes"].get("lastName", "")},
                    "relationships": {"betaGroups": {"data": [{"type": "betaGroups", "id": group_id}]}},
                }
            })
            added += 1
        except urllib.error.HTTPError:
            pass  # already a tester of this group, or not eligible (e.g. a role with no ASC login) — not fatal
    return {"groupId": group_id, "created": created, "testersAdded": added}


def cmd_attach_build(token: str, args: argparse.Namespace) -> dict[str, Any]:
    call(token, "POST", f"/betaGroups/{args.group_id}/relationships/builds", {
        "data": [{"type": "builds", "id": args.build_id}]
    })
    return {"attached": True}


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--key-id", required=True)
    p.add_argument("--issuer-id", required=True)
    p.add_argument("--key-path", required=True, help="Path to the .p8 private key file")
    sub = p.add_subparsers(dest="command", required=True)

    a = sub.add_parser("find-or-create-app")
    a.add_argument("--bundle-id", required=True)
    a.add_argument("--name", required=True)
    a.add_argument("--sku", required=True)
    a.add_argument("--locale", default="en-US")
    a.set_defaults(func=cmd_find_or_create_app)

    b = sub.add_parser("latest-build")
    b.add_argument("--app-id", required=True)
    b.add_argument("--version", required=True)
    b.add_argument("--build", required=True)
    b.set_defaults(func=cmd_latest_build)

    c = sub.add_parser("wait-build")
    c.add_argument("--app-id", required=True)
    c.add_argument("--version", required=True)
    c.add_argument("--build", required=True)
    c.add_argument("--timeout-seconds", type=int, default=1800)
    c.add_argument("--interval-seconds", type=int, default=30)
    c.set_defaults(func=cmd_wait_build)

    d = sub.add_parser("ensure-internal-group")
    d.add_argument("--app-id", required=True)
    d.add_argument("--group-name", default="DoOnce Internal")
    d.set_defaults(func=cmd_ensure_internal_group)

    e = sub.add_parser("attach-build")
    e.add_argument("--group-id", required=True)
    e.add_argument("--build-id", required=True)
    e.set_defaults(func=cmd_attach_build)

    args = p.parse_args()
    token = make_jwt(args.key_id, args.issuer_id, args.key_path)
    result = args.func(token, args)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
