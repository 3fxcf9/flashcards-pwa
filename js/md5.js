// md5 function (IA generated) compatible with
//   Digest.string front |> Digest.to_hex
// TODO: Change hash function for native support

export function md5(input) {
  const bytes = new TextEncoder().encode(input);

  function leftRotate(x, amount) {
    return (x << amount) | (x >>> (32 - amount));
  }

  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
    9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
    16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
    15, 21,
  ];

  const K = new Uint32Array(64);

  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
  }

  const bitLength = bytes.length * 8;
  const paddedLength = ((bytes.length + 9 + 63) >>> 6) << 6;
  const message = new Uint8Array(paddedLength);
  message.set(bytes);
  message[bytes.length] = 0x80;

  /*
   * MD5 uses little-endian 64-bit length.
   */
  let length = bitLength;
  for (let i = 0; i < 8; i++) {
    message[paddedLength - 8 + i] = length & 0xff;
    length = Math.floor(length / 256);
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const view = new DataView(message.buffer);

  for (let offset = 0; offset < message.length; offset += 64) {
    const M = new Uint32Array(16);

    for (let i = 0; i < 16; i++) {
      M[i] = view.getUint32(offset + i * 4, true);
    }

    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let i = 0; i < 64; i++) {
      let F;
      let g;

      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }

      const oldD = D;
      const sum = (A + F + K[i] + M[g]) >>> 0;

      D = C;
      C = B;
      B = (B + leftRotate(sum, s[i])) >>> 0;
      A = oldD;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  function wordToHex(word) {
    return [
      word & 0xff,
      (word >>> 8) & 0xff,
      (word >>> 16) & 0xff,
      (word >>> 24) & 0xff,
    ]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  }

  return wordToHex(a0) + wordToHex(b0) + wordToHex(c0) + wordToHex(d0);
}
