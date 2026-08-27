#!/usr/bin/env python3
"""Crop a PNG from its top-left corner. Standard library only.

Used by tools/make-og.sh: some headless Chrome builds paint a viewport
shorter than the window they were asked for, so the share cards are
rendered on an oversized window and trimmed back to 1200x630 here.

    python3 tools/pngcrop.py in.png out.png 1200 630
"""
import struct, sys, zlib


def read(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    pos, idat, meta = 8, bytearray(), None
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        kind = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        if kind == b"IHDR":
            meta = struct.unpack(">IIBBBBB", body)
        elif kind == b"IDAT":
            idat += body
        elif kind == b"IEND":
            break
        pos += 12 + length
    w, h, depth, colour, comp, filt, inter = meta
    assert depth == 8 and inter == 0, "expects 8-bit, non-interlaced"
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[colour]
    return w, h, colour, channels, zlib.decompress(bytes(idat))


def unfilter(raw, w, h, ch):
    stride = w * ch
    out, prev = bytearray(), bytearray(stride)
    at = 0
    for _ in range(h):
        ft = raw[at]; at += 1
        line = bytearray(raw[at:at + stride]); at += stride
        if ft == 1:
            for i in range(ch, stride): line[i] = (line[i] + line[i - ch]) & 255
        elif ft == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif ft == 3:
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif ft == 4:
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                b = prev[i]
                c = prev[i - ch] if i >= ch else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out += line
        prev = line
    return out


def write(path, pixels, w, h, colour, ch):
    raw = bytearray()
    stride = w * ch
    for y in range(h):
        raw.append(0)
        raw += pixels[y * stride:(y + 1) * stride]

    def chunk(kind, body):
        return (struct.pack(">I", len(body)) + kind + body
                + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF))

    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n")
        fh.write(chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, colour, 0, 0, 0)))
        fh.write(chunk(b"IDAT", zlib.compress(bytes(raw), 9)))
        fh.write(chunk(b"IEND", b""))


def main():
    src, dst, cw, chh = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    w, h, colour, ch, raw = read(src)
    cw, chh = min(cw, w), min(chh, h)
    flat = unfilter(raw, w, h, ch)
    cropped = bytearray()
    for y in range(chh):
        start = y * w * ch
        cropped += flat[start:start + cw * ch]
    write(dst, cropped, cw, chh, colour, ch)
    print(f"  {dst}  {cw}x{chh}")


if __name__ == "__main__":
    main()
